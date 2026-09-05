#!/usr/bin/env node
// @ts-check

import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  AlbumUserRole,
  Permission,
  addUsersToAlbum,
  createApiKey,
  createUserAdmin,
  defaults,
  getAllAlbums,
  init,
  login,
  searchAssets,
  searchUsersAdmin,
  updateAlbumInfo,
  updateUserAdmin,
} from "@immich/sdk";

/** @typedef {{ albums: string[], apply: boolean, envFile: string, output: string }} Options */
/** @typedef {{ id: string, name: string, personId?: string }} Actor */
/** @typedef {Actor & { apiKey: string }} ActorSecret */

/** @param {string[]} argv @returns {Options} */
function parseArguments(argv) {
  /** @type {Options} */
  const options = {
    albums: [],
    apply: false,
    envFile: ".env",
    output: ".immich-activity-actors.json",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--album") options.albums.push(requiredValue(argv, ++index, argument));
    else if (argument === "--env-file") options.envFile = requiredValue(argv, ++index, argument);
    else if (argument === "--output") options.output = requiredValue(argv, ++index, argument);
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

/** @param {string[]} argv @param {number} index @param {string} option */
function requiredValue(argv, index, option) {
  const value = argv[index];
  if (!value) throw new Error(`${option} requires a value`);
  return value;
}

/** @param {string} path */
async function loadEnvironment(path) {
  const contents = await readFile(path, "utf8");
  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/u);
    if (!match || process.env[match[1]]) continue;
    const rawValue = match[2].trim();
    const quotedValue = rawValue.match(/^(['"])(.*)\1$/u);
    process.env[match[1]] = quotedValue
      ? quotedValue[2]
      : rawValue.replace(/\s+#.*$/u, "").trim();
  }
}

/** @param {string} baseUrl @param {string} apiKey */
function configureAdmin(baseUrl, apiKey) {
  defaults.headers = {};
  init({ baseUrl: `${baseUrl}/api`, apiKey });
}

/** @param {string} baseUrl */
function configureAnonymous(baseUrl) {
  defaults.headers = {};
  init({ baseUrl: `${baseUrl}/api`, apiKey: "" });
}

/** @param {string} baseUrl @param {string} accessToken */
function configureSession(baseUrl, accessToken) {
  defaults.headers = {};
  init({
    baseUrl: `${baseUrl}/api`,
    apiKey: "",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  await loadEnvironment(options.envFile);

  const baseUrl = process.env.IMMICH_BASE_URL;
  const adminApiKey = process.env.API_KEY;
  if (!baseUrl || !adminApiKey) throw new Error("IMMICH_BASE_URL and API_KEY are required");

  configureAdmin(baseUrl, adminApiKey);
  const sharedAlbums = await getAllAlbums({ isShared: true });
  const albums = options.albums.length
    ? sharedAlbums.filter((album) => options.albums.includes(album.id))
    : sharedAlbums;
  /** @type {Map<string, import("@immich/sdk").PersonResponseDto>} */
  const people = new Map();

  for (const album of albums) {
    const results = await searchAssets({
      metadataSearchDto: { albumIds: [album.id], withPeople: true },
    });
    for (const asset of results.assets.items) {
      for (const person of asset.people ?? []) people.set(person.id, person);
    }
  }

  /** @type {Actor[]} */
  const actors = [{ id: "guest", name: "Guest" }];
  for (const person of people.values()) {
    actors.push({
      id: `person-${person.id}`,
      name: person.name || "Unnamed person",
      personId: person.id,
    });
  }

  console.log(`${actors.length} activity actors across ${albums.length} shared album(s):`);
  for (const actor of actors) console.log(`  - ${actor.name} (${actor.id})`);
  if (!options.apply) {
    console.log("\nDry run only. Re-run with --apply to create users and API keys.");
    return;
  }

  const usersByEmail = new Map(
    (await searchUsersAdmin({ withDeleted: false })).map((user) => [user.email, user]),
  );
  /** @type {ActorSecret[]} */
  const registry = [];

  for (const actor of actors) {
    configureAdmin(baseUrl, adminApiKey);
    const email = `activity-${actor.id}@immich.local`;
    const password = randomBytes(24).toString("base64url");
    let user = usersByEmail.get(email);

    if (user) {
      user = await updateUserAdmin({
        id: user.id,
        userAdminUpdateDto: { name: actor.name, password, shouldChangePassword: false },
      });
    } else {
      user = await createUserAdmin({
        userAdminCreateDto: {
          email,
          name: actor.name,
          notify: false,
          password,
          quotaSizeInBytes: 0,
          shouldChangePassword: false,
        },
      });
    }

    for (const album of albums) {
      configureAdmin(baseUrl, adminApiKey);
      if (!album.isActivityEnabled) {
        await updateAlbumInfo({
          id: album.id,
          updateAlbumDto: { isActivityEnabled: true },
        });
      }
      if (!album.albumUsers.some(({ user: albumUser }) => albumUser.id === user.id)) {
        await addUsersToAlbum({
          id: album.id,
          addUsersDto: {
            albumUsers: [{ role: AlbumUserRole.Viewer, userId: user.id }],
          },
        });
      }
    }

    configureAnonymous(baseUrl);
    const session = await login({ loginCredentialDto: { email, password } });
    configureSession(baseUrl, session.accessToken);
    const key = await createApiKey({
      apiKeyCreateDto: {
        name: "photo gallery activity",
        permissions: [Permission.ActivityCreate, Permission.ActivityRead],
      },
    });
    registry.push({ ...actor, apiKey: key.secret });
  }

  await writeFile(options.output, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
  console.log(`\nWrote ${options.output}. Store its JSON as IMMICH_ACTIVITY_ACTORS, then delete the file.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

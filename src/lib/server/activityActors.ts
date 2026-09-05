import type { PersonResponseDto } from "@immich/sdk";
import { env } from "cloudflare:workers";

export type ActivityActor = {
  id: string;
  name: string;
  personId?: string;
  apiKey: string;
};

type PublicActor = Omit<ActivityActor, "apiKey">;

function getActorSecret() {
  const secret = env.IMMICH_ACTIVITY_ACTORS;
  if (!secret) {
    throw new Error("IMMICH_ACTIVITY_ACTORS is not configured");
  }

  const actors: unknown = JSON.parse(secret);
  if (!Array.isArray(actors)) {
    throw new Error("IMMICH_ACTIVITY_ACTORS must be a JSON array");
  }

  return actors as ActivityActor[];
}

export function getActivityActor(id: string) {
  return getActorSecret().find((actor) => actor.id === id) ?? null;
}

export function getPublicActors(people: PersonResponseDto[]): PublicActor[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));

  return getActorSecret()
    .filter((actor) => actor.id === "guest" || (actor.personId && peopleById.has(actor.personId)))
    .map(({ apiKey: _apiKey, ...actor }) => ({
      ...actor,
      name: actor.personId ? peopleById.get(actor.personId)?.name ?? actor.name : actor.name,
    }));
}

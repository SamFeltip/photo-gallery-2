import type { PersonResponseDto } from "@immich/sdk";
import { IMMICH_ACTIVITY_ACTORS } from "astro:env/server";

export type ActivityActor = {
  id: string;
  name: string;
  personId?: string;
  albumIds?: string[];
  apiKey: string;
};

type PublicActor = Omit<ActivityActor, "apiKey">;

function getActorSecret() {
  const secret = IMMICH_ACTIVITY_ACTORS;
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

export function getActivityReadApiKey(albumId: string) {
  return (
    getActorSecret().find(
      (actor) => !actor.albumIds || actor.albumIds.includes(albumId),
    )?.apiKey ?? null
  );
}

export function getPublicActors(people: PersonResponseDto[]): PublicActor[] {
  return [
    { id: "guest", name: "Guest" },
    ...people
      .filter(({ name }) => name.trim().length > 0)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(({ id, name }) => ({ id: `person-${id}`, name, personId: id })),
  ];
}

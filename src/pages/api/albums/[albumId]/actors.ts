import type { APIRoute } from "astro";
import { getAlbumPeople } from "@/lib/immichHelpers";
import { getPublicActors } from "@/lib/server/activityActors";
import { initImmich } from "@/lib/server/immich";

export const GET: APIRoute = async ({ params }) => {
  if (!params.albumId) return new Response("Album is required", { status: 400 });

  try {
    initImmich();
    const people = [...(await getAlbumPeople(params.albumId)).values()];
    return Response.json(getPublicActors(people), {
      headers: { "cache-control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("Unable to load activity actors", error);
    return new Response("Unable to load activity actors", { status: 500 });
  }
};

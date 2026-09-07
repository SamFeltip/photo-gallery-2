import type { APIRoute } from "astro";
import { getPersonThumbnailForActivityPicker } from "@/lib/server/immich";

export const GET: APIRoute = async ({ params }) => {
  if (!params.personId) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const thumbnail = await getPersonThumbnailForActivityPicker(params.personId);
    return new Response(thumbnail.stream(), {
      headers: {
        "cache-control": "public, max-age=86400",
        "content-type": thumbnail.type || "image/jpeg",
      },
    });
  } catch (error) {
    console.error("Unable to load person thumbnail", error);
    return new Response("Not found", { status: 404 });
  }
};

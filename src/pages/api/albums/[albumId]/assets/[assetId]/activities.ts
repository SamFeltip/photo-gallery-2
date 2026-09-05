import type { APIRoute } from "astro";
import { ReactionType } from "@immich/sdk";
import { getActivityActor } from "@/lib/server/activityActors";
import {
  createActorActivity,
  getAssetActivityStatistics,
  listAssetActivities,
} from "@/lib/server/immich";

export const GET: APIRoute = async ({ params }) => {
  if (!params.albumId || !params.assetId) return new Response("Album and asset are required", { status: 400 });

  try {
    const [activities, statistics] = await Promise.all([
      listAssetActivities(params.albumId, params.assetId),
      getAssetActivityStatistics(params.albumId, params.assetId),
    ]);
    return Response.json({ activities, statistics }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Unable to load activities", error);
    return new Response("Unable to load activities", { status: 500 });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  if (!params.albumId || !params.assetId) return new Response("Album and asset are required", { status: 400 });

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return new Response("Invalid activity", { status: 400 });

    const { actorId, type, comment } = body as Record<string, unknown>;
    if (typeof actorId !== "string" || (type !== "like" && type !== "comment")) {
      return new Response("Invalid activity", { status: 400 });
    }
    if (type === "comment" && (typeof comment !== "string" || !comment.trim())) {
      return new Response("A comment is required", { status: 400 });
    }

    const actor = getActivityActor(actorId);
    if (!actor) return new Response("Unknown actor", { status: 404 });

    const activity = await createActorActivity(actor.apiKey, {
      albumId: params.albumId,
      assetId: params.assetId,
      type: type === "like" ? ReactionType.Like : ReactionType.Comment,
      ...(type === "comment" ? { comment: (comment as string).trim() } : {}),
    });
    return Response.json(activity, { status: 201 });
  } catch (error) {
    console.error("Unable to create activity", error);
    return new Response("Unable to create activity", { status: 500 });
  }
};

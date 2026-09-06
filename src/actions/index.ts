import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { ReactionType } from "@immich/sdk";
import { getAlbumPeople } from "@/lib/immichHelpers";
import {
  getActivityActor,
  getActivityReadApiKey,
  getPublicActors,
} from "@/lib/server/activityActors";
import {
  createActorActivity,
  getAssetActivityStatistics,
  initImmich,
  listAssetActivities,
} from "@/lib/server/immich";

const photoInput = z.object({
  albumId: z.string().min(1),
  assetId: z.string().min(1),
});

export const server = {
  getAlbumActors: defineAction({
    input: z.object({ albumId: z.string().min(1) }),
    handler: async ({ albumId }) => {
      try {
        initImmich();
        const people = [...(await getAlbumPeople(albumId)).values()];
        return getPublicActors(people);
      } catch (cause) {
        console.error("Unable to load activity actors", cause);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to load people",
        });
      }
    },
  }),

  getPhotoActivities: defineAction({
    input: photoInput,
    handler: async ({ albumId, assetId }) => {
      try {
        const activityApiKey = getActivityReadApiKey(albumId);
        if (!activityApiKey) {
          throw new Error("No activity actor API key is configured");
        }
        const [activities, statistics] = await Promise.all([
          listAssetActivities(albumId, assetId, activityApiKey),
          getAssetActivityStatistics(albumId, assetId, activityApiKey),
        ]);
        return { activities, statistics };
      } catch (cause) {
        console.error("Unable to load activities", cause);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to load activities",
        });
      }
    },
  }),

  createPhotoActivity: defineAction({
    input: photoInput.extend({
      actorId: z.string().min(1),
      type: z.enum(["like", "comment"]),
      comment: z.string().trim().min(1).optional(),
    }),
    handler: async ({ actorId, albumId, assetId, type, comment }) => {
      if (type === "comment" && !comment) {
        throw new ActionError({ code: "BAD_REQUEST", message: "A comment is required" });
      }

      const actor = getActivityActor(actorId);
      if (!actor) {
        throw new ActionError({ code: "NOT_FOUND", message: "Unknown actor" });
      }

      try {
        return await createActorActivity(actor.apiKey, {
          albumId,
          assetId,
          type: type === "like" ? ReactionType.Like : ReactionType.Comment,
          ...(type === "comment" ? { comment } : {}),
        });
      } catch (cause) {
        console.error("Unable to create activity", cause);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to save activity",
        });
      }
    },
  }),
};

import {
  createActivity,
  getActivities,
  getActivityStatistics,
  getPersonThumbnail,
  init,
  type ActivityCreateDto,
} from "@immich/sdk";
import { env } from "cloudflare:workers";

export function initImmich() {
  const baseUrl = env.IMMICH_BASE_URL;
  const apiKey = env.API_KEY;

  if (!baseUrl || !apiKey) throw new Error("Immich server credentials are not configured");

  init({ baseUrl: `${baseUrl}/api`, apiKey });
  return { baseUrl, apiKey };
}

export async function listAssetActivities(albumId: string, assetId: string) {
  initImmich();
  return getActivities({ albumId, assetId });
}

export async function getAssetActivityStatistics(albumId: string, assetId: string) {
  initImmich();
  return getActivityStatistics({ albumId, assetId });
}

export async function createActorActivity(
  actorApiKey: string,
  activityCreateDto: ActivityCreateDto,
) {
  initImmich();
  return createActivity(
    { activityCreateDto },
    { headers: { "x-api-key": actorApiKey } },
  );
}

export async function getPersonThumbnailForActivityPicker(personId: string) {
  initImmich();
  return getPersonThumbnail({ id: personId });
}

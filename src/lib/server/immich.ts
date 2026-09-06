import {
  createActivity,
  getActivities,
  getActivityStatistics,
  getPersonThumbnail,
  init,
  type ActivityCreateDto,
} from "@immich/sdk";
import { API_KEY, IMMICH_BASE_URL } from "astro:env/server";

export function initImmich() {
  const baseUrl = IMMICH_BASE_URL;
  const apiKey = API_KEY;

  if (!baseUrl || !apiKey) throw new Error("Immich server credentials are not configured");

  init({ baseUrl: `${baseUrl}/api`, apiKey });
  return { baseUrl, apiKey };
}

export async function listAssetActivities(
  albumId: string,
  assetId: string,
  apiKey?: string,
) {
  initImmich();
  return getActivities(
    { albumId, assetId },
    apiKey ? { headers: { "x-api-key": apiKey } } : undefined,
  );
}

export async function getAssetActivityStatistics(
  albumId: string,
  assetId: string,
  apiKey?: string,
) {
  initImmich();
  return getActivityStatistics(
    { albumId, assetId },
    apiKey ? { headers: { "x-api-key": apiKey } } : undefined,
  );
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

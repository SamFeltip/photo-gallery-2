import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  createActivity: vi.fn(),
  getActivities: vi.fn(),
  getActivityStatistics: vi.fn(),
  getPersonThumbnail: vi.fn(),
  init: vi.fn(),
}));

vi.mock("@immich/sdk", () => sdk);

import {
  createActorActivity,
  getAssetActivityStatistics,
  listAssetActivities,
} from "./immich";

describe("Immich activity SDK wrapper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads activities with the selected album actor key", async () => {
    sdk.getActivities.mockResolvedValue([]);
    await listAssetActivities("album-1", "asset-1", "actor-key");

    expect(sdk.init).toHaveBeenCalledWith({
      apiKey: "admin-test-key",
      baseUrl: "https://immich.example.test/api",
    });
    expect(sdk.getActivities).toHaveBeenCalledWith(
      { albumId: "album-1", assetId: "asset-1" },
      { headers: { "x-api-key": "actor-key" } },
    );
  });

  it("reads statistics through the SDK with actor permissions", async () => {
    sdk.getActivityStatistics.mockResolvedValue({ comments: 0, likes: 0 });
    await getAssetActivityStatistics("album-1", "asset-1", "actor-key");

    expect(sdk.getActivityStatistics).toHaveBeenCalledWith(
      { albumId: "album-1", assetId: "asset-1" },
      { headers: { "x-api-key": "actor-key" } },
    );
  });

  it("creates activity through the SDK as the chosen actor", async () => {
    const activity = {
      activityCreateDto: {
        albumId: "album-1",
        assetId: "asset-1",
        comment: "Hello world",
        type: "comment",
      },
    } as const;
    sdk.createActivity.mockResolvedValue({ id: "activity-1" });
    await createActorActivity("actor-key", activity.activityCreateDto as never);

    expect(sdk.createActivity).toHaveBeenCalledWith(activity, {
      headers: { "x-api-key": "actor-key" },
    });
  });
});

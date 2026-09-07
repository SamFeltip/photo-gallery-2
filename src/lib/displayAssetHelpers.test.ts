import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  searchAssets: vi.fn(),
  searchStacks: vi.fn(),
}));

vi.mock("@immich/sdk", () => ({
  AssetTypeEnum: { Image: "IMAGE", Video: "VIDEO" },
  searchAssets: sdk.searchAssets,
  searchStacks: sdk.searchStacks,
}));

import { getDisplayAssets } from "./displayAssetHelpers";

function asset(
  id: string,
  options: {
    date?: string;
    rating?: number | null;
    type?: "IMAGE" | "VIDEO";
  } = {},
) {
  return {
    exifInfo: { rating: options.rating ?? null },
    fileCreatedAt: options.date ?? "2026-01-01T00:00:00.000Z",
    id,
    localDateTime: options.date,
    type: options.type ?? "IMAGE",
  };
}

describe("getDisplayAssets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deduplicates images, filters low ratings and sorts chronologically", async () => {
    const latest = asset("latest", { date: "2026-03-01T00:00:00.000Z", rating: 5 });
    const hidden = asset("hidden", { date: "2026-01-01T00:00:00.000Z", rating: 2 });
    const earliest = asset("earliest", { date: "2026-02-01T00:00:00.000Z" });
    sdk.searchAssets.mockResolvedValue({
      assets: { items: [latest, hidden, earliest, latest, asset("video", { type: "VIDEO" })] },
    });
    sdk.searchStacks.mockResolvedValue([]);

    const result = await getDisplayAssets("album-1");

    expect(sdk.searchAssets).toHaveBeenCalledWith({
      metadataSearchDto: {
        albumIds: ["album-1"],
        withExif: true,
        withPeople: true,
        withStacked: true,
      },
    });
    expect(result.map(({ id }) => id)).toEqual(["earliest", "latest"]);
  });

  it("collapses stacks around the primary asset and omits stacks missing it", async () => {
    const primary = asset("primary", { date: "2026-02-01T00:00:00.000Z", rating: 4 });
    const alternate = asset("alternate", { date: "2026-01-01T00:00:00.000Z", rating: 5 });
    const orphan = asset("orphan");
    sdk.searchAssets.mockResolvedValue({ assets: { items: [alternate, primary, orphan] } });
    sdk.searchStacks.mockResolvedValue([
      { id: "stack-1", primaryAssetId: "primary", assets: [primary, alternate] },
      { id: "stack-2", primaryAssetId: "missing", assets: [orphan] },
    ]);

    await expect(getDisplayAssets("album-1")).resolves.toEqual([
      { id: "stack-1", bestItem: primary, stackItems: [alternate] },
    ]);
  });
});

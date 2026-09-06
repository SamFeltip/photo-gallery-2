import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAllTags, searchAssets, AssetTypeEnum } from "@immich/sdk";
import { getGalleryTagData } from "./galleryTags";
import type { AssetResponseDto } from "@immich/sdk";

vi.mock("@immich/sdk", async (importOriginal) => ({
  ...await importOriginal<typeof import("@immich/sdk")>(),
  getAllTags: vi.fn(),
  searchAssets: vi.fn(),
}));

const asset = (id: string) => ({ id, type: AssetTypeEnum.Image }) as AssetResponseDto;

describe("getGalleryTagData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads tags via the SDK, excludes unused tags, and unions stack matches", async () => {
    vi.mocked(getAllTags).mockResolvedValue([
      { id: "tag-lake", name: "Lake", value: "Lake", createdAt: "", updatedAt: "" },
      { id: "tag-unused", name: "Unused", value: "Unused", createdAt: "", updatedAt: "" },
    ]);
    vi.mocked(searchAssets).mockImplementation(async ({ metadataSearchDto }) => ({
      albums: { count: 0, facets: [], items: [], total: 0 },
      assets: {
        count: metadataSearchDto.tagIds?.[0] === "tag-lake" ? 2 : 0,
        facets: [],
        items: metadataSearchDto.tagIds?.[0] === "tag-lake" ? [asset("primary"), asset("stacked")] : [],
        nextPage: null,
        total: metadataSearchDto.tagIds?.[0] === "tag-lake" ? 2 : 0,
      },
    }));

    const result = await getGalleryTagData("album", [
      { id: "stack", bestItem: asset("primary"), stackItems: [asset("stacked")] },
    ]);

    expect(result.tags).toEqual([{ id: "tag-lake", name: "Lake", value: "Lake", count: 1 }]);
    expect(result.tagIdsByGroupId).toEqual({ stack: ["tag-lake"] });
    expect(searchAssets).toHaveBeenCalledWith({
      metadataSearchDto: expect.objectContaining({ albumIds: ["album"], tagIds: ["tag-lake"] }),
    });
  });
});

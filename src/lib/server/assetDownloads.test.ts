import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetMediaSize } from "@immich/sdk";
import {
  createContentDisposition,
  getAlbumAssetDownload,
  isAssetDownloadSize,
  isValidDownloadId,
  sanitizeDownloadFilename,
} from "./assetDownloads";

function createDependencies() {
  return {
    downloadAsset: vi.fn(),
    getAssetInfo: vi.fn(),
    getShareKey: vi.fn(),
    initImmich: vi.fn(),
    viewAsset: vi.fn(),
  };
}

describe("asset downloads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("downloads an original through the Immich SDK with the album share key", async () => {
    const dependencies = createDependencies();
    const original = new Blob(["original"], { type: "image/heic" });
    dependencies.getShareKey.mockResolvedValue("share-key");
    dependencies.getAssetInfo.mockResolvedValue({ originalFileName: "Lake.heic" });
    dependencies.downloadAsset.mockResolvedValue(original);

    await expect(getAlbumAssetDownload({
      albumId: "album-1",
      assetId: "asset-1",
      size: "original",
    }, dependencies as never)).resolves.toEqual({
      blob: original,
      filename: "Lake.heic",
    });

    expect(dependencies.initImmich).toHaveBeenCalledOnce();
    expect(dependencies.getShareKey).toHaveBeenCalledWith("album-1");
    expect(dependencies.getAssetInfo).toHaveBeenCalledWith({
      id: "asset-1",
      key: "share-key",
    });
    expect(dependencies.downloadAsset).toHaveBeenCalledWith({
      id: "asset-1",
      key: "share-key",
    });
    expect(dependencies.viewAsset).not.toHaveBeenCalled();
  });

  it("downloads a preview through the Immich SDK and gives it a matching extension", async () => {
    const dependencies = createDependencies();
    const preview = new Blob(["preview"], { type: "image/jpeg" });
    dependencies.getShareKey.mockResolvedValue("share-key");
    dependencies.getAssetInfo.mockResolvedValue({ originalFileName: "Holiday.mov" });
    dependencies.viewAsset.mockResolvedValue(preview);

    await expect(getAlbumAssetDownload({
      albumId: "album-1",
      assetId: "asset-1",
      size: "small",
    }, dependencies as never)).resolves.toEqual({
      blob: preview,
      filename: "Holiday-small.jpg",
    });

    expect(dependencies.viewAsset).toHaveBeenCalledWith({
      id: "asset-1",
      key: "share-key",
      size: AssetMediaSize.Preview,
    });
    expect(dependencies.downloadAsset).not.toHaveBeenCalled();
  });

  it("rejects malformed identifiers before initializing the SDK", async () => {
    const dependencies = createDependencies();

    await expect(getAlbumAssetDownload({
      albumId: "../album",
      assetId: "asset-1",
      size: "original",
    }, dependencies as never)).rejects.toThrow("Invalid album or asset id");
    expect(dependencies.initImmich).not.toHaveBeenCalled();
  });

  it("validates supported sizes and route identifiers", () => {
    expect(isAssetDownloadSize("original")).toBe(true);
    expect(isAssetDownloadSize("small")).toBe(true);
    expect(isAssetDownloadSize("thumbnail")).toBe(false);
    expect(isValidDownloadId("d4d1f58d-c16f-4bfd-8885-99465c5500e5")).toBe(true);
    expect(isValidDownloadId("../asset")).toBe(false);
    expect(isValidDownloadId(undefined)).toBe(false);
  });

  it("creates safe ASCII and UTF-8 content-disposition filenames", () => {
    expect(sanitizeDownloadFilename('  Sémillon/\"2026\".jpg  ')).toBe(
      "Sémillon--2026-.jpg",
    );
    const disposition = createContentDisposition("Sémillon.jpg");
    expect(disposition).toContain('filename="Se_millon.jpg"');
    expect(disposition).toContain("filename*=UTF-8''S%C3%A9millon.jpg");
    expect(disposition).not.toContain("\r");
    expect(disposition).not.toContain("\n");
  });
});

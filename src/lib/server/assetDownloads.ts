import {
  AssetMediaSize,
  downloadAsset,
  getAssetInfo,
  viewAsset,
} from "@immich/sdk";
import { getShareKey } from "@/lib/shareKey";
import { initImmich } from "@/lib/server/immich";

export const assetDownloadSizes = ["original", "small"] as const;

export type AssetDownloadSize = (typeof assetDownloadSizes)[number];

type AssetDownloadDependencies = {
  downloadAsset: typeof downloadAsset;
  getAssetInfo: typeof getAssetInfo;
  getShareKey: typeof getShareKey;
  initImmich: typeof initImmich;
  viewAsset: typeof viewAsset;
};

const defaultDependencies: AssetDownloadDependencies = {
  downloadAsset,
  getAssetInfo,
  getShareKey,
  initImmich,
  viewAsset,
};

const mimeExtensions: Record<string, string> = {
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function isAssetDownloadSize(value: string | null): value is AssetDownloadSize {
  return assetDownloadSizes.includes(value as AssetDownloadSize);
}

export function isValidDownloadId(value: string | undefined): value is string {
  return Boolean(value && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value));
}

export function sanitizeDownloadFilename(value: string, fallback = "photo") {
  const sanitized = value
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[. ]+|[. ]+$/g, "")
    .slice(0, 180)
    .replace(/[. ]+$/g, "");

  return sanitized || fallback;
}

function smallFilename(originalFilename: string, mimeType: string) {
  const safeOriginal = sanitizeDownloadFilename(originalFilename);
  const lastDot = safeOriginal.lastIndexOf(".");
  const basename = lastDot > 0 ? safeOriginal.slice(0, lastDot) : safeOriginal;
  const originalExtension = lastDot > 0 ? safeOriginal.slice(lastDot) : "";
  const extension = mimeExtensions[mimeType.toLowerCase()] ?? originalExtension;
  return sanitizeDownloadFilename(`${basename}-small${extension}`);
}

export function createContentDisposition(filename: string) {
  const safeFilename = sanitizeDownloadFilename(filename);
  const asciiFilename = safeFilename
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  const encodedFilename = encodeURIComponent(safeFilename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

export async function getAlbumAssetDownload(
  {
    albumId,
    assetId,
    size,
  }: {
    albumId: string;
    assetId: string;
    size: AssetDownloadSize;
  },
  dependencies: AssetDownloadDependencies = defaultDependencies,
) {
  if (!isValidDownloadId(albumId) || !isValidDownloadId(assetId)) {
    throw new TypeError("Invalid album or asset id");
  }

  dependencies.initImmich();
  const key = await dependencies.getShareKey(albumId);
  const [asset, blob] = await Promise.all([
    dependencies.getAssetInfo({ id: assetId, key }),
    size === "original"
      ? dependencies.downloadAsset({ id: assetId, key })
      : dependencies.viewAsset({ id: assetId, key, size: AssetMediaSize.Preview }),
  ]);
  const originalFilename = asset.originalFileName || assetId;
  const filename = size === "small"
    ? smallFilename(originalFilename, blob.type)
    : sanitizeDownloadFilename(originalFilename, assetId);

  return { blob, filename };
}

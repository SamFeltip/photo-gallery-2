import type { APIRoute } from "astro";
import {
  createContentDisposition,
  getAlbumAssetDownload,
  isAssetDownloadSize,
  isValidDownloadId,
} from "@/lib/server/assetDownloads";

export const GET: APIRoute = async ({ params, url }) => {
  const { albumId, assetId } = params;
  const size = url.searchParams.get("size") ?? "original";

  if (!isValidDownloadId(albumId) || !isValidDownloadId(assetId)) {
    return new Response("Invalid album or asset id", { status: 400 });
  }
  if (!isAssetDownloadSize(size)) {
    return new Response("Invalid download size", { status: 400 });
  }

  try {
    const { blob, filename } = await getAlbumAssetDownload({
      albumId,
      assetId,
      size,
    });

    return new Response(blob.stream(), {
      headers: {
        "cache-control": "private, max-age=3600",
        "content-disposition": createContentDisposition(filename),
        "content-length": String(blob.size),
        "content-type": blob.type || "application/octet-stream",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to download album asset", error);
    return new Response("Asset not found", { status: 404 });
  }
};

import { SharedLinkType, type SharedLinkResponseDto } from "@immich/sdk";

function isPublicAlbumLink(link: SharedLinkResponseDto) {
  return (
    link.type === SharedLinkType.Album &&
    link.expiresAt == null &&
    link.password == null &&
    typeof link.key === "string" &&
    link.key.trim().length > 0
  );
}

export function getGalleryAlbumLinks(links: SharedLinkResponseDto[]) {
  const byAlbum = new Map<string, SharedLinkResponseDto>();
  for (const link of links) {
    const albumId = link.album?.id;
    if (albumId && !byAlbum.has(albumId) && isPublicAlbumLink(link)) {
      byAlbum.set(albumId, link);
    }
  }
  return byAlbum;
}

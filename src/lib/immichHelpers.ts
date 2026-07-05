import { searchAssets } from "@immich/sdk";

export async function getAlbumPeople(albumId: string) {
  const assets = await searchAssets({
    metadataSearchDto: { albumIds: [albumId], withPeople: true },
  });

  return new Map(
    assets.assets.items
      .flatMap((item) => item.people ?? [])
      .map((person) => [person.id, person]),
  );
}

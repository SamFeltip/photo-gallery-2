import { getAllTags, searchAssets, type TagResponseDto } from "@immich/sdk";
import type { AssetStack } from "@/types/assets";

export type GalleryTag = Pick<TagResponseDto, "id" | "name" | "value"> & {
  count: number;
};

export type GalleryTagData = {
  tags: GalleryTag[];
  tagIdsByGroupId: Record<string, string[]>;
};

async function getAssetIdsForTag(albumId: string, tagId: string) {
  const assetIds = new Set<string>();
  let page = 1;

  while (true) {
    const result = await searchAssets({
      metadataSearchDto: {
        albumIds: [albumId],
        page,
        size: 1_000,
        tagIds: [tagId],
      },
    });

    for (const asset of result.assets.items) assetIds.add(asset.id);
    if (!result.assets.nextPage) break;

    const nextPage = Number(result.assets.nextPage);
    if (!Number.isFinite(nextPage) || nextPage <= page) break;
    page = nextPage;
  }

  return assetIds;
}

/** Resolves the tags used by visible album cards using Immich SDK searches. */
export async function getGalleryTagData(
  albumId: string,
  displayAssets: AssetStack[],
): Promise<GalleryTagData> {
  const tags = await getAllTags();
  const groupIdsByAssetId = new Map<string, string>();
  const tagIdsByGroupId = Object.fromEntries(
    displayAssets.map(({ id }) => [id, [] as string[]]),
  );

  for (const group of displayAssets) {
    groupIdsByAssetId.set(group.bestItem.id, group.id);
    for (const asset of group.stackItems ?? []) {
      groupIdsByAssetId.set(asset.id, group.id);
    }
  }

  const matches = await Promise.all(
    tags.map(async (tag) => ({ tag, assetIds: await getAssetIdsForTag(albumId, tag.id) })),
  );

  const galleryTags: GalleryTag[] = [];
  for (const { tag, assetIds } of matches) {
    const matchingGroupIds = new Set<string>();
    for (const assetId of assetIds) {
      const groupId = groupIdsByAssetId.get(assetId);
      if (groupId) matchingGroupIds.add(groupId);
    }

    if (matchingGroupIds.size === 0) continue;
    for (const groupId of matchingGroupIds) tagIdsByGroupId[groupId].push(tag.id);
    galleryTags.push({
      id: tag.id,
      name: tag.name,
      value: tag.value,
      count: matchingGroupIds.size,
    });
  }

  galleryTags.sort((left, right) =>
    (left.name || left.value).localeCompare(right.name || right.value),
  );

  return { tags: galleryTags, tagIdsByGroupId };
}

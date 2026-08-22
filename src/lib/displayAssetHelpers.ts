import {
  AssetTypeEnum,
  searchAssets,
  searchStacks,
  type AssetResponseDto,
  type StackResponseDto,
} from "@immich/sdk";
import type { AssetStack } from "../types/assets";

const IMMICH_BASE_URL = import.meta.env.IMMICH_BASE_URL;
const API_KEY = import.meta.env.API_KEY;

/**
 * Builds the ordered list of {@link AssetStack} entries to display for the
 * album.
 *
 * - Assets are grouped by stack membership (an unstacked asset forms its
 *   own single-item group, keyed by its own id).
 * - A stacked group's `bestItem` is whichever member is the stack's
 *   `primaryAssetId`; if that primary asset isn't among this album's
 *   results, the whole stack is skipped (matches prior behavior, which
 *   never recorded a stack unless its primary asset was encountered).
 * - An unstacked group's `bestItem` is its asset (falling back to the
 *   highest-rated member in the unlikely case of duplicates).
 * - Groups whose `bestItem` is rated 1 or 2 stars are filtered out.
 * - The result is sorted ascending by `bestItem`'s `localDateTime`
 *   (falling back to `fileCreatedAt`).
 *
 * @returns the ordered list of display-ready asset stacks
 */
export async function getDisplayAssets(id: string): Promise<AssetStack[]> {
  const rawAssets = (
    await searchAssets({
      metadataSearchDto: {
        albumIds: [id],
        withPeople: true,
        withStacked: true,
        withExif: true,
      },
    })
  ).assets.items;

  const rawPhotos = Array.from(rawAssets).filter(
    (asset) => asset.type === AssetTypeEnum.Image,
  );

  const dedupedAssets = Array.from(
    new Map(rawPhotos.map((asset) => [asset.id, asset])).values(),
  );

  // One extra request to resolve stack membership for all assets at once.
  const assetIdToStackId = await getAssetIdToStackIdMap();

  // --- group deduped assets by stack (or by their own id when unstacked) ---
  const membersByGroup = new Map<string, AssetResponseDto[]>();
  const stackByGroup = new Map<string, StackResponseDto>();

  for (const asset of dedupedAssets) {
    const stack = assetIdToStackId.get(asset.id) ?? null;
    const groupId: string = stack?.id ?? asset.id;

    if (stack != null) {
      stackByGroup.set(groupId, stack);
    }

    const members = membersByGroup.get(groupId);
    if (members) {
      members.push(asset);
    } else {
      membersByGroup.set(groupId, [asset]);
    }
  }

  // --- collapse each group down to its bestItem ---
  const groups: AssetStack[] = [];

  for (const [groupId, members] of membersByGroup) {
    const stack = stackByGroup.get(groupId);

    if (stack) {
      const bestItem = members.find(
        (asset) => asset.id === stack.primaryAssetId,
      );
      if (!bestItem) continue; // primary not present in this album's results

      groups.push({
        id: groupId,
        bestItem,
        stackItems: members.filter((asset) => asset.id !== bestItem.id),
      });
      continue;
    }

    // Unstacked group: normally a single asset; fall back to the
    // highest-rated member if duplicates were somehow present.
    const bestItem = members.reduce((best, asset) =>
      getRating(asset) > getRating(best) ? asset : best,
    );
    groups.push({ id: groupId, bestItem });
  }

  // --- filter out 1-star and 2-star assets, then order chronologically ---
  return groups
    .filter((group) => [null, 0, 3, 4, 5].includes(getRating(group.bestItem)))
    .sort(
      (a, b) => getAssetTimestamp(a.bestItem) - getAssetTimestamp(b.bestItem),
    );
}

// --- helper accessors (adjust here if your API shape differs) ---
function getRating(asset: AssetResponseDto) {
  // ACCESSOR SPOT 1: change if rating isn't at asset.exifInfo.rating
  return asset?.exifInfo?.rating ?? 0;
}

// --- fetch all stacks once, build assetId -> stackId lookup ---
// Album/asset responses don't reliably include stack membership, so we
// hit /api/stacks separately and index it ourselves.
async function getAssetIdToStackIdMap(): Promise<
  Map<string, StackResponseDto>
> {
  const stacks = await searchStacks({});

  const map = new Map<string, StackResponseDto>();
  for (const stack of stacks) {
    // Each stack has an id and an array of member assets (including the primary).
    for (const asset of stack.assets) {
      if (asset.id) {
        map.set(asset.id, stack);
      }
    }
  }
  return map;
}

/**
 * Reads the timestamp to sort an asset by, preferring `localDateTime` and
 * falling back to `fileCreatedAt`.
 *
 * @param asset - the asset to read a timestamp from
 * @returns milliseconds since epoch, or `0` if neither field parses
 */
function getAssetTimestamp(asset: AssetResponseDto): number {
  const raw = asset.localDateTime ?? asset.fileCreatedAt;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

import type { AssetResponseDto } from "@immich/sdk";

/**
 * A single displayable entry in the asset grid: either a standalone asset,
 * or an asset stack collapsed down to its best item.
 */
export type AssetStack = {
  /** Either the asset id (unstacked) or the stack id (stacked). */
  id: string;
  /** Highest-rated item in the stack, or the only item if not stacked. */
  bestItem: AssetResponseDto;
  /** All items in this stack, if applicable. */
  stackItems?: AssetResponseDto[];
};

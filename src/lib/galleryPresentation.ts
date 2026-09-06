import type { AssetStack } from "@/types/assets";

export function albumHasStacks(assets: AssetStack[]) {
  return assets.some(({ stackItems }) => Boolean(stackItems?.length));
}

export function getFancyboxGroup(
  albumId: string,
  asset: AssetStack,
  hasStacks: boolean,
) {
  return hasStacks ? asset.id : `album-${albumId}`;
}

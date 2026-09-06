import { describe, expect, it } from "vitest";
import type { AssetStack } from "@/types/assets";
import { albumHasStacks, getFancyboxGroup } from "./galleryPresentation";

const unstacked = { id: "asset-1", bestItem: { id: "asset-1" } } as AssetStack;
const stacked = {
  id: "stack-1",
  bestItem: { id: "asset-2" },
  stackItems: [{ id: "asset-3" }],
} as AssetStack;

describe("gallery presentation", () => {
  it("groups every photo into an album carousel when there are no stacks", () => {
    expect(albumHasStacks([unstacked])).toBe(false);
    expect(getFancyboxGroup("album-1", unstacked, false)).toBe("album-album-1");
  });

  it("uses each stack as its own carousel when stacks exist", () => {
    expect(albumHasStacks([unstacked, stacked])).toBe(true);
    expect(getFancyboxGroup("album-1", stacked, true)).toBe("stack-1");
    expect(getFancyboxGroup("album-1", unstacked, true)).toBe("asset-1");
  });
});

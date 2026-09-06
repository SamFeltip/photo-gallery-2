import { describe, expect, it, vi } from "vitest";
import { getNeighborIndexes, installIntentPrefetch } from "./imagePrefetch";

describe("image prefetch", () => {
  it("returns bounded, wrapping carousel neighbors", () => {
    expect(getNeighborIndexes(0, 4)).toEqual([3, 1]);
    expect(getNeighborIndexes(0, 2)).toEqual([1]);
    expect(getNeighborIndexes(0, 1)).toEqual([]);
  });

  it("prefetches once intent is shown", () => {
    const assignedSources: string[] = [];
    vi.stubGlobal(
      "Image",
      class {
        decoding = "auto";
        set src(value: string) {
          assignedSources.push(value);
        }
      },
    );
    document.body.innerHTML = '<a data-prefetch-src="/full/photo-1.jpg">Photo</a>';
    const cleanup = installIntentPrefetch();
    document.querySelector("a")?.dispatchEvent(new Event("pointerenter"));

    expect(assignedSources).toEqual(["/full/photo-1.jpg"]);
    cleanup();
    vi.unstubAllGlobals();
  });
});

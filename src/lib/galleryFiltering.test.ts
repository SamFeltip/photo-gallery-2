import { describe, expect, it } from "vitest";
import {
  installGalleryFiltering,
  matchesGalleryFilters,
  readTagsFromUrl,
  writeTagsToUrl,
} from "./galleryFiltering";

describe("gallery filtering", () => {
  it("matches every selected face and any selected tag", () => {
    const asset = { people: "sam,alex", tags: "holiday,lake" };

    expect(matchesGalleryFilters(asset, {
      people: new Set(["sam", "alex"]),
      tags: new Set(["lake", "city"]),
    })).toBe(true);
    expect(matchesGalleryFilters(asset, {
      people: new Set(["sam", "missing"]),
      tags: new Set(["lake"]),
    })).toBe(false);
    expect(matchesGalleryFilters(asset, {
      people: new Set(),
      tags: new Set(["missing"]),
    })).toBe(false);
  });

  it("shows every asset when no filters are selected", () => {
    expect(matchesGalleryFilters({}, { people: new Set(), tags: new Set() })).toBe(true);
  });

  it("reads only available repeated tag parameters", () => {
    expect([...readTagsFromUrl("?tag=lake&tag=unknown&view=grid", new Set(["lake"]))])
      .toEqual(["lake"]);
  });

  it("updates tag parameters while preserving other URL state", () => {
    expect(writeTagsToUrl("?view=grid&tag=old", ["lake", "city"]))
      .toBe("?view=grid&tag=city&tag=lake");
    expect(writeTagsToUrl("?tag=old", [])).toBe("");
  });

  it("hides non-matches even when gallery CSS supplies its own display value", () => {
    document.body.innerHTML = `
      <div id="gallery-filter">
        <button data-gallery-tag="lake">Lake</button>
        <span data-gallery-result-count></span>
        <div id="photoswipe">
          <a class="thumbhash-img" data-tags="lake" style="display:flex">Lake</a>
          <a class="thumbhash-img" data-tags="city" style="display:flex">City</a>
        </div>
        <div data-gallery-empty hidden></div>
      </div>`;

    const cleanup = installGalleryFiltering();
    document.querySelector<HTMLButtonElement>("[data-gallery-tag]")?.click();
    const assets = document.querySelectorAll<HTMLElement>(".thumbhash-img");

    expect(assets[0].style.display).toBe("flex");
    expect(assets[0]).not.toHaveClass("gallery-filter-hidden");
    expect(assets[1].style.display).toBe("flex");
    expect(assets[1]).toHaveClass("gallery-filter-hidden");
    cleanup();
  });
});

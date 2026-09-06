import { describe, expect, it } from "vitest";
import {
  getGuestLovedAssetIds,
  isGuestLoved,
  toggleGuestLove,
} from "./guestActivity";

describe("guest activity", () => {
  it("toggles loves per album without sharing them across albums", () => {
    expect(toggleGuestLove("album-a", "photo-1")).toBe(true);
    expect(isGuestLoved("album-a", "photo-1")).toBe(true);
    expect(isGuestLoved("album-b", "photo-1")).toBe(false);
    expect(toggleGuestLove("album-a", "photo-1")).toBe(false);
    expect(getGuestLovedAssetIds("album-a")).toEqual([]);
  });

  it("recovers from invalid local storage", () => {
    localStorage.setItem("guest-loves-album-a", "not-json");
    expect(getGuestLovedAssetIds("album-a")).toEqual([]);
  });
});

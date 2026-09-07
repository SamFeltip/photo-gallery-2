import { beforeEach, describe, expect, it, vi } from "vitest";

const getAllSharedLinks = vi.hoisted(() => vi.fn());
vi.mock("@immich/sdk", () => ({ getAllSharedLinks }));

import { getShareKey, isNonExpiringAlbumShareLink } from "./shareKey";

describe("share keys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recognises only non-expiring links for the requested album", () => {
    expect(isNonExpiringAlbumShareLink({ album: { id: "a" }, expiresAt: null }, "a")).toBe(true);
    expect(isNonExpiringAlbumShareLink({ album: { id: "a" }, expiresAt: "2099-01-01" }, "a")).toBe(false);
    expect(isNonExpiringAlbumShareLink({ album: { id: "b" }, expiresAt: null }, "a")).toBe(false);
  });

  it("returns the non-expiring SDK link key", async () => {
    getAllSharedLinks.mockResolvedValue([
      { album: { id: "album-1" }, expiresAt: "2099-01-01", key: "temporary" },
      { album: { id: "album-1" }, expiresAt: null, key: "permanent" },
    ]);

    await expect(getShareKey("album-1")).resolves.toBe("permanent");
    expect(getAllSharedLinks).toHaveBeenCalledWith({ albumId: "album-1" });
  });

  it("rejects missing album ids and albums without a permanent link", async () => {
    await expect(getShareKey("")).rejects.toThrow("No album id provided");
    getAllSharedLinks.mockResolvedValue([]);
    await expect(getShareKey("album-1")).rejects.toThrow(
      "No shared link found for album id album-1",
    );
  });
});

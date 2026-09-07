import { describe, expect, it, vi } from "vitest";

const searchAssets = vi.hoisted(() => vi.fn());
vi.mock("@immich/sdk", () => ({ searchAssets }));

import { getAlbumPeople } from "./immichHelpers";

describe("getAlbumPeople", () => {
  it("returns each person once and keeps the latest SDK representation", async () => {
    searchAssets.mockResolvedValue({
      assets: {
        items: [
          { people: [{ id: "sam", name: "Sam" }, { id: "alex", name: "Alex" }] },
          { people: [{ id: "sam", name: "Samuel" }] },
          { people: undefined },
        ],
      },
    });

    const people = await getAlbumPeople("album-1");

    expect(searchAssets).toHaveBeenCalledWith({
      metadataSearchDto: { albumIds: ["album-1"], withPeople: true },
    });
    expect([...people.keys()]).toEqual(["sam", "alex"]);
    expect(people.get("sam")?.name).toBe("Samuel");
  });
});

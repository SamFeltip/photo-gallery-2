import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({
  IMMICH_ACTIVITY_ACTORS: JSON.stringify([
    { id: "sam", name: "Sam", personId: "person-sam", albumIds: ["album-1"], apiKey: "sam-key" },
    { id: "alex", name: "Alex", apiKey: "alex-key" },
  ]),
}));

import {
  getActivityActor,
  getActivityReadApiKey,
  getPublicActors,
} from "./activityActors";

describe("activity actors", () => {
  it("finds actors and respects album-scoped reader keys", () => {
    expect(getActivityActor("sam")?.apiKey).toBe("sam-key");
    expect(getActivityActor("missing")).toBeNull();
    expect(getActivityReadApiKey("album-1")).toBe("sam-key");
    expect(getActivityReadApiKey("album-2")).toBe("alex-key");
  });

  it("publishes Guest plus named people in alphabetical order without secrets", () => {
    const result = getPublicActors([
      { id: "z", name: "Zoe" },
      { id: "blank", name: "  " },
      { id: "a", name: "Alex" },
    ] as never);

    expect(result).toEqual([
      { id: "guest", name: "Guest" },
      { id: "person-a", name: "Alex", personId: "a" },
      { id: "person-z", name: "Zoe", personId: "z" },
    ]);
    expect(result).not.toHaveProperty("apiKey");
  });
});

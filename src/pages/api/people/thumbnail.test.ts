import { describe, expect, it, vi } from "vitest";

const getPersonThumbnail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/immich", () => ({
  getPersonThumbnailForActivityPicker: getPersonThumbnail,
}));

import { GET } from "./[personId]/thumbnail";

describe("person thumbnail route", () => {
  it("proxies the image with a public cache policy", async () => {
    getPersonThumbnail.mockResolvedValue({
      stream: () => new ReadableStream({ start: (controller) => controller.close() }),
      type: "image/png",
    });

    const response = await GET({ params: { personId: "person-1" } } as never);

    expect(getPersonThumbnail).toHaveBeenCalledWith("person-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
  });

  it("returns 404 for missing people and upstream failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(GET({ params: {} } as never)).resolves.toMatchObject({ status: 404 });
    getPersonThumbnail.mockRejectedValue(new Error("missing"));
    await expect(
      GET({ params: { personId: "missing" } } as never),
    ).resolves.toMatchObject({ status: 404 });
  });
});

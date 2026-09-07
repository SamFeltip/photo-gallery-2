import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactionType, UserAvatarColor } from "@immich/sdk";
import { describe, expect, it, vi } from "vitest";
import { FancyboxDrawer, type ActivityClient } from "./FancyboxDrawer";

function createClient(): ActivityClient {
  return {
    createActivity: vi.fn().mockResolvedValue(undefined),
    getActivities: vi.fn().mockResolvedValue({
      activities: [
        {
          assetId: "photo-1",
          comment: "A lovely view",
          createdAt: "2026-09-05T12:00:00.000Z",
          id: "comment-1",
          type: ReactionType.Comment,
          user: {
            avatarColor: UserAvatarColor.Primary,
            email: "sam@example.test",
            id: "user-sam",
            name: "Sam Felton",
            profileChangedAt: "2026-09-05T12:00:00.000Z",
            profileImagePath: "",
          },
        },
      ],
      statistics: { comments: 1, likes: 2 },
    }),
    getActors: vi.fn().mockResolvedValue([
      { id: "guest", name: "Guest" },
      { id: "person-sam", name: "Sam Felton", personId: "sam" },
    ]),
  };
}

function openDrawer(action?: "like" | "comment") {
  act(() => {
    window.dispatchEvent(
      new CustomEvent("open-fancybox-drawer", {
        detail: { action, assetId: "photo-1" },
      }),
    );
  });
}

describe("FancyboxDrawer", () => {
  it("renders comments and face choices, including Guest", async () => {
    render(<FancyboxDrawer activityClient={createClient()} albumId="album-a" />);
    openDrawer();

    expect(await screen.findByText("A lovely view")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Choose identity" }));

    expect(
      await screen.findByRole("button", { name: /Guest/ }),
    ).toBeVisible();
    const sam = screen.getByRole("button", { name: "Sam Felton" });
    expect(sam).toBeVisible();
    expect(sam.querySelector("img")).toHaveAttribute(
      "src",
      "/api/people/sam/thumbnail",
    );
  });

  it("keeps Guest loves local and disables Guest comments", async () => {
    const client = createClient();
    localStorage.setItem("activity-identity-album-a", "guest");
    render(<FancyboxDrawer activityClient={client} albumId="album-a" />);
    await waitFor(() =>
      expect(localStorage.getItem("activity-identity-album-a")).toBe("guest"),
    );
    openDrawer("like");

    expect(await screen.findByText("3 loves · 1 comment")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Add a comment" })).toBeDisabled();
    expect(screen.getByText(/Guest loves stay on this device/)).toBeVisible();
    expect(client.createActivity).not.toHaveBeenCalled();
  });

  it("submits a pending comment immediately after face selection", async () => {
    const client = createClient();
    render(<FancyboxDrawer activityClient={client} albumId="album-a" />);
    openDrawer();
    const input = await screen.findByRole("textbox", { name: "Add a comment" });
    await userEvent.type(input, "Hello from the lake");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    await userEvent.click(await screen.findByRole("button", { name: "Sam Felton" }));

    await waitFor(() =>
      expect(client.createActivity).toHaveBeenCalledWith({
        actorId: "person-sam",
        albumId: "album-a",
        assetId: "photo-1",
        comment: "Hello from the lake",
        type: "comment",
      }),
    );
  });

  it("closes cleanly and restores page interaction", async () => {
    render(<FancyboxDrawer activityClient={createClient()} albumId="album-a" />);
    openDrawer();
    await userEvent.click(
      await screen.findByRole("button", { name: "Close comments" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Comments" }),
      ).not.toBeInTheDocument(),
    );
    expect(document.body).not.toHaveStyle({ pointerEvents: "none" });
  });
});

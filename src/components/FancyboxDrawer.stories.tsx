import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ReactionType, UserAvatarColor, type ActivityResponseDto } from "@immich/sdk";
import { FancyboxDrawer, type ActivityClient } from "./FancyboxDrawer";

const actors = [
  { id: "guest", name: "Guest" },
  { id: "person-sam", name: "Sam Felton", personId: "sam" },
];

const existingComment: ActivityResponseDto = {
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
};

function createClient(initialActivities: ActivityResponseDto[] = []): ActivityClient {
  const activities = [...initialActivities];
  let likes = 0;
  return {
    async getActors() {
      return actors;
    },
    async getActivities() {
      return {
        activities: [...activities],
        statistics: {
          comments: activities.filter(({ type }) => type === ReactionType.Comment).length,
          likes,
        },
      };
    },
    async createActivity(input) {
      if (input.type === "like") {
        likes += 1;
        return;
      }
      activities.push({
        ...existingComment,
        comment: input.comment,
        id: `comment-${activities.length + 1}`,
      });
    },
  };
}

const meta = {
  title: "Activity/Fancybox drawer",
  component: FancyboxDrawer,
  args: {
    albumId: "storybook-album",
    activityClient: createClient(),
  },
} satisfies Meta<typeof FancyboxDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { activityClient: createClient() },
  play: async ({ canvasElement }) => {
    window.dispatchEvent(
      new CustomEvent("open-fancybox-drawer", { detail: { assetId: "photo-1" } }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.findByText("Start the conversation")).resolves.toBeVisible();
  },
};

export const ExistingComment: Story = {
  args: { activityClient: createClient([existingComment]) },
  play: async ({ canvasElement }) => {
    window.dispatchEvent(
      new CustomEvent("open-fancybox-drawer", { detail: { assetId: "photo-1" } }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.findByText("A lovely view")).resolves.toBeVisible();
    await expect(body.findByText("0 loves · 1 comment")).resolves.toBeVisible();
  },
};

export const GuestLove: Story = {
  args: { activityClient: createClient() },
  play: async ({ canvasElement }) => {
    window.localStorage.clear();
    window.dispatchEvent(
      new CustomEvent("open-fancybox-drawer", {
        detail: { action: "like", assetId: "photo-1" },
      }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("button", { name: /Guest/ }));
    await waitFor(async () => {
      await expect(body.getByText("1 love · 0 comments")).toBeVisible();
    });
    await expect(body.getByRole("textbox", { name: "Add a comment" })).toBeDisabled();
  },
};

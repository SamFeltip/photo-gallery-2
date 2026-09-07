import { expect, test } from "@playwright/test";

async function openStory(page: import("@playwright/test").Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
}

test("documents the empty activity state", async ({ page }) => {
  await openStory(page, "activity-fancybox-drawer--empty");
  await expect(page.getByText("Start the conversation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose identity" })).toBeVisible();
});

test("documents existing Immich comments and counts", async ({ page }) => {
  await openStory(page, "activity-fancybox-drawer--existing-comment");
  await expect(page.getByText("A lovely view")).toBeVisible();
  await expect(page.getByText("0 loves · 1 comment")).toBeVisible();
});

test("documents and exercises the Guest love flow", async ({ page }) => {
  await openStory(page, "activity-fancybox-drawer--guest-love");
  await expect(page.getByText("1 love · 0 comments")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a comment" })).toBeDisabled();
  await expect(page.getByText(/Guest loves stay on this device/)).toBeVisible();
});

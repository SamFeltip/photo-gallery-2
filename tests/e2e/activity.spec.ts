import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("shows face choices and submits a named comment", async ({ page }) => {
  await page.getByRole("button", { name: "Open photo" }).click();
  await page.getByRole("button", { name: "Comments" }).click();
  await page.getByRole("button", { name: "Choose identity" }).click();

  await expect(page.getByRole("button", { name: /Guest/ })).toBeVisible();
  const sam = page.getByRole("button", { name: "Sam Felton" });
  await expect(sam.locator("img")).toBeVisible();
  await sam.click();

  await page.getByRole("textbox", { name: "Add a comment" }).fill("Hello world");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hello world")).toBeVisible();
  await expect(page.getByText("1 comment", { exact: false })).toBeVisible();
});

test("keeps Guest love local and prevents Guest comments", async ({ page }) => {
  await page.getByRole("button", { name: "Open photo" }).click();
  await page.getByRole("button", { name: "Love" }).click();
  await page.getByRole("button", { name: /Guest/ }).click();

  await expect(page.getByText("1 love · 0 comments")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add a comment" })).toBeDisabled();
  await expect(page.getByText(/Guest loves stay on this device/)).toBeVisible();
});

test("restores page clickability after closing both layers", async ({ page }) => {
  await page.getByRole("button", { name: "Open photo" }).click();
  await page.getByRole("button", { name: "Comments" }).click();
  await page.getByRole("button", { name: "Close comments" }).click();
  await page.getByRole("button", { name: "Close photo" }).click();
  await page.getByRole("button", { name: /Page remains clickable/ }).click();

  await expect(page.getByRole("button", { name: "Page remains clickable: 1" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
});

test("prefetches a full image when the thumbnail shows pointer intent", async ({ page }) => {
  const requested = page.waitForRequest((request) =>
    request.url().endsWith("/prefetch/photo-1.jpg"),
  );
  await page.getByRole("link", { name: "Prefetch photo" }).hover();
  await expect(requested).resolves.toBeTruthy();
});

test("filters by multiple tags, updates counts, and clears the selection", async ({ page }) => {
  await page.getByRole("button", { name: "Lake", exact: true }).click();
  await expect(page).toHaveURL(/tag=lake/);
  await expect(page.getByText("2 of 3 photos")).toBeVisible();
  await expect(page.getByRole("link", { name: "City photo", exact: true })).toBeHidden();

  await page.getByRole("button", { name: "City" }).click();
  await expect(page.getByText("3 of 3 photos")).toBeVisible();

  await page.getByRole("button", { name: "Clear tags" }).click();
  await expect(page).not.toHaveURL(/tag=/);
  await expect(page.getByRole("button", { name: "Clear tags" })).toBeHidden();
});

test("restores a shared tag-filter URL and shows an empty state", async ({ page }) => {
  await page.goto("/?tag=city");
  await expect(page.getByRole("button", { name: "City" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("2 of 3 photos")).toBeVisible();

  await page.evaluate(() => {
    document.querySelector("#gallery-filter")?.dispatchEvent(new CustomEvent("person", {
      bubbles: true,
      detail: { personId: "missing", toggleMode: "active" },
    }));
  });
  await expect(page.getByText("No matching photos")).toBeVisible();
  await expect(page.getByText("0 of 3 photos")).toBeVisible();
});

test("opens handheld stories and supports keyboard controls", async ({ page }) => {
  const firstStory = page.getByRole("button", { name: /Open story 1/ });
  await firstStory.click();
  await expect(page.getByRole("dialog", { name: /Story 1 of 3/ })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: /Story 2 of 3/ })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Resume story" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Story/ })).toBeHidden();
  await expect(firstStory).toBeFocused();
});

test("swipes between stories and opens their shared comment drawer", async ({ page }) => {
  await page.getByRole("button", { name: /Open story 1/ }).click();
  const dialog = page.getByRole("dialog", { name: /Story 1 of 3/ });
  await dialog.dispatchEvent("pointerdown", { clientY: 500 });
  await dialog.dispatchEvent("pointerup", { clientY: 300 });
  await expect(page.getByRole("dialog", { name: /Story 2 of 3/ })).toBeVisible();

  await page.getByRole("button", { name: "Comment on this story" }).click();
  await expect(page.getByRole("dialog", { name: "Comments" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Choose who you are" })).toBeVisible();
  await page.getByRole("button", { name: "Sam Felton" }).click();
  const comment = page.getByRole("textbox", { name: "Add a comment" });
  await comment.pressSequentially("hello world");
  await page.keyboard.press("ArrowRight");
  await expect(comment).toHaveValue("hello world");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Comments" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Comment on this story" })).toBeFocused();
  await expect(page.getByRole("dialog", { name: /Story 2 of 3/ })).toBeVisible();
  await page.getByRole("button", { name: "Close stories" }).click();
  await expect(page.getByRole("dialog", { name: /Story/ })).toBeHidden();
  expect(await page.locator("body").evaluate((body) => ({
    overflow: body.style.overflow,
    inertChildren: [...body.children].filter((child) => (child as HTMLElement).inert).length,
  }))).toEqual({ overflow: "", inertChildren: 0 });
  await page.getByRole("button", { name: /Page remains clickable/ }).click();
  await expect(page.getByRole("button", { name: "Page remains clickable: 1" })).toBeVisible();
});

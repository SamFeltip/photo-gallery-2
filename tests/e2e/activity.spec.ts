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

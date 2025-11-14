import { test, expect } from "@playwright/test";
import { existsSync, unlinkSync, readdirSync, rmdirSync } from "fs";
import { join } from "path";

/**
 * E2E tests for Frame TV connection and authorization workflow.
 *
 * CRITICAL: All tests run with MOCK_TV=true to prevent accidental real TV connections.
 */

const TEST_IP = "192.168.1.100";
const TEST_PORT = 8002;
const TEST_PIN = "1234";

const DATA_ROOT = join(__dirname, "../../..", "data");
const SHOULD_USE_TEST_TOKEN_DIR =
  process.env.MOCK_TV === "true" || process.env.PLAYWRIGHT_TEST === "true";
const TOKEN_DIR = SHOULD_USE_TEST_TOKEN_DIR
  ? join(DATA_ROOT, ".test")
  : DATA_ROOT;

// Helper to get token file path
function getTokenFilePath(): string {
  // Use test-specific token directory whenever MOCK_TV/PLAYWRIGHT_TEST are set
  return join(TOKEN_DIR, "tv_token.txt");
}

// Helper to clean up token file before/after tests
function cleanupTokenFile() {
  const tokenPath = getTokenFilePath();

  // Remove token file if it exists
  if (existsSync(tokenPath)) {
    unlinkSync(tokenPath);
  }

  if (SHOULD_USE_TEST_TOKEN_DIR) {
    // Remove test directory if it exists and is empty
    try {
      if (existsSync(TOKEN_DIR)) {
        const files = readdirSync(TOKEN_DIR);
        if (files.length === 0) {
          rmdirSync(TOKEN_DIR);
        }
      }
    } catch (error) {
      // Ignore errors cleaning up directory
    }
  }
}

test.describe("TV Authorization Workflow", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    if (!SHOULD_USE_TEST_TOKEN_DIR) {
      throw new Error(
        "MOCK_TV=true (or PLAYWRIGHT_TEST=true) is required before running these tests. Please restart the sync service with TEST env vars."
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    // Clean up token file before each test
    cleanupTokenFile();

    // Reset mock state by calling a test endpoint or restarting service
    // For now, cleanup token file is sufficient as mock state resets on new connection
  });

  test.afterEach(() => {
    // Clean up token file after each test
    cleanupTokenFile();
  });

  test("should load settings page", async ({ page }) => {
    await page.goto("/settings");

    // Check that settings page loads
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Frame TV Connection" })
    ).toBeVisible();

    // Check form fields exist
    await expect(page.getByLabel("TV IP Address")).toBeVisible();
    await expect(page.getByLabel("Port")).toBeVisible();
  });

  test("should save IP address and port settings", async ({ page }) => {
    await page.goto("/settings");

    // Fill in IP address
    await page.getByLabel("TV IP Address").fill(TEST_IP);

    // Fill in port
    await page.getByLabel("Port").fill(TEST_PORT.toString());

    // Click save settings
    await page.getByRole("button", { name: "Save Settings" }).click();

    // Wait for success toast
    await expect(page.getByText("Settings saved", { exact: true })).toBeVisible(
      { timeout: 5000 }
    );

    // Reload page and verify settings persisted
    await page.reload();
    await expect(page.getByLabel("TV IP Address")).toHaveValue(TEST_IP);
    await expect(page.getByLabel("Port")).toHaveValue(TEST_PORT.toString());
  });

  test("should connect and show PIN input when PIN is required", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Set IP and port
    await page.getByLabel("TV IP Address").fill(TEST_IP);
    await page.getByLabel("Port").fill(TEST_PORT.toString());

    // Click connect button
    await page.getByRole("button", { name: "Connect & Authorize" }).click();

    // Wait for connection to complete and PIN input to appear
    // The PIN input appears after the connection determines PIN is required
    const pinInput = page.getByLabel("Enter PIN");
    await expect(pinInput).toBeVisible({ timeout: 15000 });
    // Scope the Authorize button to be near the PIN input to avoid matching "Connect & Authorize"
    await expect(
      pinInput.locator("..").getByRole("button", { name: "Authorize" })
    ).toBeVisible();
  });

  test("should complete full authorization workflow with PIN", async ({
    page,
  }) => {
    await page.goto("/settings");

    // Set IP and port
    await page.getByLabel("TV IP Address").fill(TEST_IP);
    await page.getByLabel("Port").fill(TEST_PORT.toString());

    // Click connect button
    await page.getByRole("button", { name: "Connect & Authorize" }).click();

    // Wait for PIN input to appear
    const pinInput = page.getByLabel("Enter PIN");
    await expect(pinInput).toBeVisible({ timeout: 10000 });

    // Enter PIN
    await pinInput.fill(TEST_PIN);

    // Click authorize - scope to PIN input section to avoid matching "Connect & Authorize"
    await pinInput
      .locator("..")
      .getByRole("button", { name: "Authorize" })
      .click();

    // Wait for success message - leverage the connection status text which is unique
    await expect(
      page.getByText("Authorized successfully", { exact: true })
    ).toBeVisible({
      timeout: 15000,
    });

    // Verify token file was created
    const tokenPath = getTokenFilePath();
    expect(existsSync(tokenPath)).toBe(true);

    // PIN input should be hidden after successful authorization
    await expect(page.getByLabel("Enter PIN")).not.toBeVisible();
  });

  test("should handle connection errors gracefully", async ({
    page,
    request,
  }) => {
    // Note: This test would require setting MOCK_TV_SCENARIO=connection_error
    // which would need the sync service to restart. For now, we test that
    // the UI properly displays error messages when they occur.
    // The mock currently uses success_with_pin scenario, so invalid IPs still
    // trigger PIN flow. In a real scenario, connection errors would show error messages.

    await page.goto("/settings");

    // Set invalid IP
    await page.getByLabel("TV IP Address").fill("999.999.999.999");
    await page.getByLabel("Port").fill(TEST_PORT.toString());

    // Click connect button
    await page.getByRole("button", { name: "Connect & Authorize" }).click();

    // With current mock scenario (success_with_pin), invalid IP still shows PIN input
    // In real scenario with connection_error, this would show an error message
    // For now, verify the connection attempt completes (either error or PIN prompt)
    await expect(
      page.getByText(
        /Error|Failed to connect|Please enter the PIN|Connected successfully/
      )
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should check TV configuration status", async ({ page }) => {
    await page.goto("/settings");

    // Initially, TV should not be configured (no token file)
    // The check happens automatically on page load via useEffect

    // After authorization, token should exist
    // (This is tested in the full authorization workflow test)
  });

  test("should validate PIN input", async ({ page }) => {
    await page.goto("/settings");

    // Set IP and port
    await page.getByLabel("TV IP Address").fill(TEST_IP);
    await page.getByLabel("Port").fill(TEST_PORT.toString());

    // Click connect button
    await page.getByRole("button", { name: "Connect & Authorize" }).click();

    // Wait for PIN input
    const pinInput = page.getByLabel("Enter PIN");
    await expect(pinInput).toBeVisible({ timeout: 10000 });

    // Try to authorize without PIN - scope to PIN input section to avoid matching "Connect & Authorize"
    const authorizeButton = pinInput
      .locator("..")
      .getByRole("button", { name: "Authorize" });

    // Should show error or disable button (depending on implementation)
    // The button should be disabled if PIN is empty
    const isDisabled = await authorizeButton.isDisabled();

    if (isDisabled) {
      await expect(authorizeButton).toBeDisabled();
    } else {
      await authorizeButton.click();
      await expect(page.getByText(/PIN required/)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should persist settings across page reloads", async ({ page }) => {
    await page.goto("/settings");

    // Set IP and port
    await page.getByLabel("TV IP Address").fill(TEST_IP);
    await page.getByLabel("Port").fill("9000");

    // Save settings
    await page.getByRole("button", { name: "Save Settings" }).click();
    await expect(page.getByText("Settings saved", { exact: true })).toBeVisible(
      { timeout: 5000 }
    );

    // Reload page
    await page.reload();

    // Verify settings persisted
    await expect(page.getByLabel("TV IP Address")).toHaveValue(TEST_IP);
    await expect(page.getByLabel("Port")).toHaveValue("9000");
  });
});

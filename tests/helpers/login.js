/**
 * Shared login helpers for Playwright tests
 */

/**
 * Login as Admin user
 * @param {import('@playwright/test').Page} page
 */
async function loginAsAdmin(page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#admin-email').fill('admin@sukafti.com');
  await page.locator('#admin-password').fill('password');
  await Promise.all([
    page.waitForURL('**/admin/dashboard**'),
    page.locator('button[type="submit"]').first().click()
  ]);
}

/**
 * Login as Mitra using a PIN code (fills the 6 individual OTP boxes)
 * @param {import('@playwright/test').Page} page
 * @param {string} pin - 6 character PIN
 */
async function loginAsMitra(page, pin) {
  await page.goto('/login-mitra');
  const pinBoxes = page.locator('.pin-box');
  for (let i = 0; i < pin.length; i++) {
    await pinBoxes.nth(i).fill(pin[i]);
  }
  await page.locator('#btn-mitra-login').click();
  await page.waitForURL('**/survey-mitra**');
}

module.exports = { loginAsAdmin, loginAsMitra };

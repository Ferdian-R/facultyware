
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

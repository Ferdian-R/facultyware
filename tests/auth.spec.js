
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Authentication — Admin & Mitra Login', () => {

  test('1. Halaman login admin tampil dengan benar', async ({ page }) => {
    await page.goto('/login');

    
    await expect(page.locator('h1')).toContainText('Masuk Admin');

    
    await expect(page.locator('#admin-email')).toBeVisible();
    await expect(page.locator('#admin-password')).toBeVisible();

    
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('2. Login admin berhasil dengan credentials valid', async ({ page }) => {
    await loginAsAdmin(page);

    
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    
    await expect(page.locator('h1').filter({ hasText: 'Dashboard Overview' })).toBeVisible();
  });

  test('3. Login admin gagal dengan password salah', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#admin-email').fill('admin@sukafti.com');
    await page.locator('#admin-password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Email/Username atau password salah')).toBeVisible();
  });

  test('4. Halaman login mitra tampil dengan PIN boxes', async ({ page }) => {
    await page.goto('/login-mitra');

    
    await expect(page.locator('h1')).toContainText('Masuk Mitra');

    
    const pinBoxes = page.locator('.pin-box');
    await expect(pinBoxes).toHaveCount(6);
  });

  test('5. Login mitra gagal dengan PIN invalid', async ({ page }) => {
    await page.goto('/login-mitra');

    
    const pinBoxes = page.locator('.pin-box');
    const invalidPin = 'XXXXXX';
    for (let i = 0; i < invalidPin.length; i++) {
      await pinBoxes.nth(i).fill(invalidPin[i]);
    }

    await page.locator('#btn-mitra-login').click();

    
    await expect(page.locator('text=PIN tidak valid')).toBeVisible();
  });

  test('6. Logout admin berhasil', async ({ page }) => {
    
    await loginAsAdmin(page);

    
    await page.locator('#popover-profile-trigger').click();
    await page.locator('a[href="/logout"]').click();

    
    await expect(page).toHaveURL(/\/login/);
  });

});

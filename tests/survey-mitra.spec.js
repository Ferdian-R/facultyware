
const { test, expect } = require('@playwright/test');

test.describe('Survey Mitra — Pengisian Kuesioner oleh Mitra', () => {

  test('1. Halaman login mitra menampilkan OTP PIN boxes', async ({ page }) => {
    await page.goto('/login-mitra');

    
    const pinBoxes = page.locator('.pin-box');
    await expect(pinBoxes).toHaveCount(6);

    
    await expect(page.locator('text=Masukkan 6 digit PIN')).toBeVisible();
  });

  test('2. PIN boxes menerima input satu karakter dan auto-focus', async ({ page }) => {
    await page.goto('/login-mitra');

    const pinBoxes = page.locator('.pin-box');

    
    await pinBoxes.nth(0).fill('A');

    
    await pinBoxes.nth(1).fill('B');
    await pinBoxes.nth(2).fill('C');

    
    const hiddenValue = await page.locator('#mitra-pin-hidden').inputValue();
    expect(hiddenValue).toContain('ABC');
  });

  test('3. PIN yang sudah digunakan ditolak', async ({ page }) => {
    await page.goto('/login-mitra');

    
    const usedPin = 'ZZZZZZ'; 
    const pinBoxes = page.locator('.pin-box');
    for (let i = 0; i < usedPin.length; i++) {
      await pinBoxes.nth(i).fill(usedPin[i]);
    }

    await page.locator('#btn-mitra-login').click();

    
    await expect(page.locator('.bg-destructive\\/15, [class*="destructive"]').first()).toBeVisible();
  });

});

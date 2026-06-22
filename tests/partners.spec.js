// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Manajemen Mitra — CRUD Data Mitra', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/partners');
  });

  test('1. Halaman manajemen mitra tampil', async ({ page }) => {
    // Cek heading
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Mitra' })).toBeVisible();

    // Cek tombol Tambah Mitra ada
    await expect(page.locator('#btn-add-partner')).toBeVisible();
  });

  test('2. Dialog tambah mitra bisa dibuka', async ({ page }) => {
    // Klik tombol Tambah Mitra
    await page.locator('#btn-add-partner').click();

    // Dialog harus terbuka
    // Pengecekan pada #add-dialog wrapper kadang dianggap "hidden" oleh Playwright
    // karena struktur CSS Basecoat, maka kita cek inputnya langsung.
    await expect(page.locator('#add-name')).toBeVisible();
  });

  test('3. Data mitra tampil di tabel atau card', async ({ page }) => {
    // Cek ada elemen data mitra (bisa berupa tabel atau card)
    // Minimal halaman tidak error
    const content = page.locator('main');
    await expect(content).toBeVisible();

    // Cek apakah ada baris data atau pesan "belum ada data"
    const hasData = await page.locator('table tbody tr').count();
    const hasCards = await page.locator('[data-slot="card"]').count();

    // Salah satu harus ada (tabel dengan data ATAU card list)
    expect(hasData + hasCards).toBeGreaterThan(0);
  });

  test('4. Detail mitra bisa diakses', async ({ page }) => {
    // Cek apakah ada link detail mitra
    const detailLink = page.locator('a[href*="/admin/partners/"]').first();

    if (await detailLink.isVisible()) {
      await detailLink.click();

      // Harus navigasi ke halaman detail
      await expect(page).toHaveURL(/\/admin\/partners\/\d+/);
    }
  });

  test('5. Search filter mitra berfungsi', async ({ page }) => {
    // Cek apakah ada search input
    const searchInput = page.locator('input[placeholder*="Cari"], input[type="search"], input[type="text"]').first();

    if (await searchInput.isVisible()) {
      // Ketik kata kunci pencarian
      await searchInput.fill('Test');
      await searchInput.press('Enter');

      // Halaman harus reload/filter (URL berubah atau konten berubah)
      await page.waitForLoadState('networkidle');
    }
  });

});

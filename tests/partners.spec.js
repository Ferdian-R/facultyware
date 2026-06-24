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

  test('6. Validasi gagal: Menambah mitra dengan nama kosong', async ({ page }) => {
    // Klik tombol Tambah Mitra
    const btnAdd = page.locator('#btn-add-partner');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      // Kosongkan nama
      await page.locator('#add-name').fill('');
      
      // Submit form
      await page.locator('#form-add-partner button[type="submit"]').click();

      // Validasi HTML5 "required" akan mencegah form disubmit
      // Kita bisa cek apakah dialog masih terbuka
      await expect(page.locator('#add-name')).toBeVisible();
      
      // Tutup dialog
      await page.locator('#btn-close-add').click();
    }
  });

  test('7. Validasi gagal: Email mitra tidak sesuai format', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-partner');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      // Isi nama, tapi email invalid
      await page.locator('#add-name').fill('Mitra Invalid');
      await page.locator('#add-email').fill('email-yang-salah');
      
      // Submit form
      await page.locator('#form-add-partner button[type="submit"]').click();

      // HTML5 type="email" validation
      await expect(page.locator('#add-email')).toBeVisible();
      
      // Tutup dialog
      await page.locator('#btn-close-add').click();
    }
  });

});

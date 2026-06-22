// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Dashboard — Overview & PIN Management', () => {

  // Login sebelum setiap test
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('1. Dashboard menampilkan statistik card', async ({ page }) => {
    // Cek 3 stat cards tampil
    await expect(page.locator('text=Total Mitra')).toBeVisible();
    await expect(page.locator('text=PIN Aktif')).toBeVisible();
    await expect(page.locator('text=Survey Selesai')).toBeVisible();
  });

  test('2. Tabel PIN & Mitra tampil dengan header', async ({ page }) => {
    // Cek tabel header
    await expect(page.locator('th:has-text("Perusahaan Mitra")')).toBeVisible();
    await expect(page.locator('th:has-text("Kode PIN")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
  });

  test('3. Welcome banner tampil dengan pesan selamat datang', async ({ page }) => {
    await expect(page.locator('text=Selamat Datang')).toBeVisible();
  });

  test('4. Dialog Generate PIN bisa dibuka', async ({ page }) => {
    // Klik tombol Generate PIN
    await page.locator('#btn-generate-pin').click();

    // Dialog harus terbuka
    const dialog = page.locator('#pin-dialog');
    await expect(dialog).toHaveAttribute('open', '');

    // Cek ada dropdown partner dan tombol submit
    await expect(page.locator('#partner-select')).toBeAttached();
    await expect(page.locator('text=Generate PIN').last()).toBeAttached();

    // Tutup dialog
    await page.locator('#btn-close-dialog').click({ force: true });
  });

  test('5. Navigasi sidebar berfungsi', async ({ page }) => {
    // Klik menu Pertanyaan Survey
    await page.locator('a[href="/admin/questions"]').click();
    await expect(page).toHaveURL(/\/admin\/questions/);

    // Klik menu Manajemen Mitra
    await page.locator('a[href="/admin/partners"]').click();
    await expect(page).toHaveURL(/\/admin\/partners/);

    // Klik menu Hasil Survey
    await page.locator('a[href="/admin/recap-answers"]').click();
    await expect(page).toHaveURL(/\/admin\/recap-answers/);

    // Kembali ke dashboard
    await page.locator('a.flex.items-center').filter({ hasText: 'Dashboard Overview' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });

});

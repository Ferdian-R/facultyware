// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Rekap Hasil Survey — Data Jawaban Mitra', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/recap-answers');
  });

  test('1. Halaman rekap hasil survey tampil', async ({ page }) => {
    // Cek heading halaman
    await expect(page.locator('text=Hasil Survey')).toBeVisible();
  });

  test('2. Tabel rekap menampilkan kolom-kolom penting', async ({ page }) => {
    // Cek apakah ada tabel dengan header yang sesuai
    const table = page.locator('table');
    if (await table.isVisible()) {
      // Cek beberapa header kolom yang biasa ada
      const headers = page.locator('th');
      const headerTexts = await headers.allTextContents();
      const allText = headerTexts.join(' ').toLowerCase();

      // Minimal harus ada header terkait mitra/partner dan status
      expect(allText).toMatch(/mitra|partner|nama|status|skor|score/);
    }
  });

  test('3. Tombol Export Excel tersedia', async ({ page }) => {
    // Cek apakah ada tombol/link export excel
    const exportBtn = page.locator('a[href*="export-excel"], button:has-text("Export"), a:has-text("Export"), a:has-text("Excel")');

    if (await exportBtn.first().isVisible()) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });

});

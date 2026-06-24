// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Pertanyaan Survey — CRUD Instrumen Kuesioner', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/questions');
  });

  test('1. Halaman pertanyaan survey tampil', async ({ page }) => {
    // Cek heading
    await expect(page.locator('text=Instrumen Pertanyaan Survei')).toBeVisible();

    // Cek tabel pertanyaan ada
    await expect(page.locator('th:has-text("Teks Pertanyaan")')).toBeVisible();
    await expect(page.locator('th:has-text("Tipe")')).toBeVisible();
    await expect(page.locator('th:has-text("Urutan")')).toBeVisible();
      // Cek apakah ada tombol "Tambah Pertanyaan" (karena survey aktif terpilih)
      await expect(page.locator('#btn-add-question')).toBeVisible();
  });

  test('2. Dialog tambah pertanyaan bisa dibuka dan diisi', async ({ page }) => {
    // Memastikan kita ada di survey yang ada (atau buat skip logic jika kosong)
    // Di seed default, survey 1 aktif.
    const hasButton = await page.locator('#btn-add-question').isVisible();
    if (hasButton) {
      await page.locator('#btn-add-question').click();

      // Dialog harus muncul
      // Pengecekan pada wrapper sering salah dianggap hidden, langsung cek inputnya.
      await expect(page.locator('#add-question-text')).toBeVisible();

      // Cek form input ada
      await expect(page.locator('#add-question-text')).toBeVisible();
      await expect(page.locator('#add-type')).toBeVisible();

      // Isi form
      await page.locator('#add-question-text').fill('Pertanyaan Test dari Playwright');
      await page.locator('#add-type').selectOption('essay');

      // Tutup dialog tanpa submit (agar tidak mengubah data)
      await page.locator('#btn-close-add').click();
    }
  });

  test('3. Tipe jawaban pilihan ganda menampilkan opsi', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-question');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      // Pilih tipe multiple_choice
      await page.locator('#add-type').selectOption('multiple_choice');

      // Opsi jawaban section harus tampil
      const optionsSection = page.locator('#add-options-section');
      await expect(optionsSection).toBeVisible();

      // Tutup dialog
      await page.locator('#btn-close-add').click();
    }
  });

  test('4. Tipe jawaban rating menampilkan skala 1-5', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-question');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      // Pilih tipe rating
      await page.locator('#add-type').selectOption('rating');

      // Opsi jawaban section harus tampil
      const optionsSection = page.locator('#add-options-section');
      await expect(optionsSection).toBeVisible();

      // Harus ada 5 opsi default (Sangat Tidak Puas s/d Sangat Puas)
      const optionRows = page.locator('#add-options-list > div');
      await expect(optionRows).toHaveCount(5);

      // Tutup dialog
      await page.locator('#btn-close-add').click();
    }
  });

  test('5. Validasi gagal: Menambah pertanyaan dengan teks kosong', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-question');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      // Kosongkan question_text
      await page.locator('#add-question-text').fill('');
      
      // Submit form
      await page.locator('#form-add-question button[type="submit"]').click();

      // Validasi HTML5 "required" mencegah submit, form masih terlihat
      await expect(page.locator('#add-question-text')).toBeVisible();
      
      // Tutup dialog
      await page.locator('#btn-close-add').click();
    }
  });

});

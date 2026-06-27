
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Pertanyaan Survey — CRUD Instrumen Kuesioner', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/questions');
  });

  test('1. Halaman pertanyaan survey tampil', async ({ page }) => {
    
    await expect(page.locator('text=Instrumen Pertanyaan Survei')).toBeVisible();

    
    await expect(page.locator('th:has-text("Teks Pertanyaan")')).toBeVisible();
    await expect(page.locator('th:has-text("Tipe")')).toBeVisible();
    await expect(page.locator('th:has-text("Urutan")')).toBeVisible();
      
      await expect(page.locator('#btn-add-question')).toBeVisible();
  });

  test('2. Dialog tambah pertanyaan bisa dibuka dan diisi', async ({ page }) => {
    
    
    const hasButton = await page.locator('#btn-add-question').isVisible();
    if (hasButton) {
      await page.locator('#btn-add-question').click();

      
      
      await expect(page.locator('#add-question-text')).toBeVisible();

      
      await expect(page.locator('#add-question-text')).toBeVisible();
      await expect(page.locator('#add-type')).toBeVisible();

      
      await page.locator('#add-question-text').fill('Pertanyaan Test dari Playwright');
      await page.locator('#add-type').selectOption('essay');

      
      await page.locator('#btn-close-add').click();
    }
  });

  test('3. Tipe jawaban pilihan ganda menampilkan opsi', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-question');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      
      await page.locator('#add-type').selectOption('multiple_choice');

      
      const optionsSection = page.locator('#add-options-section');
      await expect(optionsSection).toBeVisible();

      
      await page.locator('#btn-close-add').click();
    }
  });

  test('4. Tipe jawaban rating menampilkan skala 1-5', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-question');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      
      await page.locator('#add-type').selectOption('rating');

      
      const optionsSection = page.locator('#add-options-section');
      await expect(optionsSection).toBeVisible();

      
      const optionRows = page.locator('#add-options-list > div');
      await expect(optionRows).toHaveCount(5);

      
      await page.locator('#btn-close-add').click();
    }
  });

  test('5. Validasi gagal: Menambah pertanyaan dengan teks kosong', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-question');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      
      await page.locator('#add-question-text').fill('');
      
      // Submit form
      await page.locator('#form-add-question button[type="submit"]').click();

      // Validasi HTML5 "required" mencegah submit, form masih terlihat
      await expect(page.locator('#add-question-text')).toBeVisible();
      
      
      await page.locator('#btn-close-add').click();
    }
  });

});

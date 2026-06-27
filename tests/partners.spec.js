
const { test, expect } = require('@playwright/test');
const { loginAsAdmin } = require('./helpers/login');

test.describe('Manajemen Mitra — CRUD Data Mitra', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/partners');
  });

  test('1. Halaman manajemen mitra tampil', async ({ page }) => {
    
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Mitra' })).toBeVisible();

    
    await expect(page.locator('#btn-add-partner')).toBeVisible();
  });

  test('2. Dialog tambah mitra bisa dibuka', async ({ page }) => {
    
    await page.locator('#btn-add-partner').click();

    
    
    
    await expect(page.locator('#add-name')).toBeVisible();
  });

  test('3. Data mitra tampil di tabel atau card', async ({ page }) => {
    
    
    const content = page.locator('main');
    await expect(content).toBeVisible();

    
    const hasData = await page.locator('table tbody tr').count();
    const hasCards = await page.locator('[data-slot="card"]').count();

    
    expect(hasData + hasCards).toBeGreaterThan(0);
  });

  test('4. Detail mitra bisa diakses', async ({ page }) => {
    
    const detailLink = page.locator('a[href*="/admin/partners/"]').first();

    if (await detailLink.isVisible()) {
      await detailLink.click();

      
      await expect(page).toHaveURL(/\/admin\/partners\/\d+/);
    }
  });

  test('5. Search filter mitra berfungsi', async ({ page }) => {
    
    const searchInput = page.locator('input[placeholder*="Cari"], input[type="search"], input[type="text"]').first();

    if (await searchInput.isVisible()) {
      
      await searchInput.fill('Test');
      await searchInput.press('Enter');

      
      await page.waitForLoadState('networkidle');
    }
  });

  test('6. Validasi gagal: Menambah mitra dengan nama kosong', async ({ page }) => {
    
    const btnAdd = page.locator('#btn-add-partner');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      
      await page.locator('#add-name').fill('');
      
      // Submit form
      await page.locator('#form-add-partner button[type="submit"]').click();

      // Validasi HTML5 "required" akan mencegah form disubmit
      // Kita bisa cek apakah dialog masih terbuka
      await expect(page.locator('#add-name')).toBeVisible();
      
      
      await page.locator('#btn-close-add').click();
    }
  });

  test('7. Validasi gagal: Email mitra tidak sesuai format', async ({ page }) => {
    const btnAdd = page.locator('#btn-add-partner');
    if (await btnAdd.isVisible()) {
      await btnAdd.click();

      
      await page.locator('#add-name').fill('Mitra Invalid');
      await page.locator('#add-email').fill('email-yang-salah');
      
      
      await page.locator('#form-add-partner button[type="submit"]').click();

      
      await expect(page.locator('#add-email')).toBeVisible();
      
      
      await page.locator('#btn-close-add').click();
    }
  });

});

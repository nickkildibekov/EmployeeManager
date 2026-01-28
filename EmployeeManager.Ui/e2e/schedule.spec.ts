import { test, expect } from '@playwright/test';

test.describe('Schedule Module E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to schedule page
    await page.goto('/schedule');
    // Wait for DayPilot scheduler to load
    await page.waitForSelector('.dp-scheduler', { timeout: 10000 });
    // Wait a bit for data to load
    await page.waitForTimeout(2000);
  });

  test('should display schedule page with scheduler', async ({ page }) => {
    // Check page title/header
    await expect(page.locator('h1')).toContainText('Графік роботи');
    
    // Check DayPilot scheduler is visible
    await expect(page.locator('.dp-scheduler')).toBeVisible();
    
    // Check quick templates panel exists
    await expect(page.locator('.quick-templates-panel')).toBeVisible();
    
    // Check filters row exists
    await expect(page.locator('.schedule-filters-row')).toBeVisible();
  });

  test('should toggle quick fill mode', async ({ page }) => {
    const toggle = page.locator('.quick-fill-toggle input[type="checkbox"]');
    
    // Initially should be unchecked
    await expect(toggle).not.toBeChecked();
    
    // Click toggle
    await toggle.click();
    
    // Should be checked
    await expect(toggle).toBeChecked();
    
    // Template buttons should be enabled
    await expect(page.locator('.template-btn').first()).not.toBeDisabled();
    
    // Click toggle again
    await toggle.click();
    
    // Should be unchecked
    await expect(toggle).not.toBeChecked();
    
    // Template buttons should be disabled
    await expect(page.locator('.template-buttons')).toHaveClass(/disabled/);
  });

  test('should select template button (4, 8, 12 hours)', async ({ page }) => {
    // Enable quick fill mode
    await page.locator('.quick-fill-toggle input[type="checkbox"]').click();
    await page.waitForTimeout(500);
    
    // Test 4 hour button
    const btn4 = page.locator('.template-btn').filter({ hasText: '4 год' });
    await btn4.click();
    await expect(btn4).toHaveClass(/active/);
    
    // Test 8 hour button
    const btn8 = page.locator('.template-btn').filter({ hasText: '8 год' });
    await btn8.click();
    await expect(btn8).toHaveClass(/active/);
    await expect(btn4).not.toHaveClass(/active/);
    
    // Test 12 hour button
    const btn12 = page.locator('.template-btn').filter({ hasText: '12 год' });
    await btn12.click();
    await expect(btn12).toHaveClass(/active/);
    await expect(btn8).not.toHaveClass(/active/);
  });

  test('should filter schedule entries by state', async ({ page }) => {
    // Check all filter checkboxes exist
    const filters = [
      'Навчання',
      'Робота',
      'Вихідний',
      'Відпустка',
      'Лікарняний'
    ];
    
    for (const filterText of filters) {
      const filter = page.locator('.state-filter-item').filter({ hasText: filterText });
      await expect(filter).toBeVisible();
      
      // Toggle filter
      const checkbox = filter.locator('input[type="checkbox"]');
      const wasChecked = await checkbox.isChecked();
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
      
      // Toggle back
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }
  });

  test('should switch between day and week views', async ({ page }) => {
    // Wait for scheduler to be ready
    await page.waitForTimeout(1000);
    
    // Check if view toggle buttons exist
    const dayButton = page.locator('.view-toggle-btn').filter({ hasText: 'День' });
    const weekButton = page.locator('.view-toggle-btn').filter({ hasText: 'Тиждень' });
    
    await expect(dayButton).toBeVisible();
    await expect(weekButton).toBeVisible();
    
    // Click week view button
    await weekButton.click();
    await page.waitForTimeout(1000);
    // Scheduler should still be visible
    await expect(page.locator('.dp-scheduler')).toBeVisible();
    
    // Click day view button
    await dayButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.dp-scheduler')).toBeVisible();
  });

  test('should handle scheduler interaction without errors', async ({ page }) => {
    // Try to interact with scheduler
    const scheduler = page.locator('.dp-scheduler');
    await expect(scheduler).toBeVisible();
    
    // Try clicking on scheduler (should not throw errors)
    await scheduler.click({ force: true });
    await page.waitForTimeout(500);
    
    // Check no error messages appeared
    const errorMessages = page.locator('text=/error|помилка/i');
    await expect(errorMessages).toHaveCount(0);
  });

  test('should display quick templates panel correctly', async ({ page }) => {
    const panel = page.locator('.quick-templates-panel');
    await expect(panel).toBeVisible();
    
    // Check toggle exists
    await expect(panel.locator('.quick-fill-toggle')).toBeVisible();
    await expect(panel.locator('.quick-fill-toggle span')).toContainText('Режим швидкого заповнення');
    
    // Check template buttons exist
    const buttons = panel.locator('.template-btn');
    await expect(buttons).toHaveCount(3);
    await expect(buttons.nth(0)).toContainText('4 год');
    await expect(buttons.nth(1)).toContainText('8 год');
    await expect(buttons.nth(2)).toContainText('12 год');
  });

  test('should have proper layout (width and height)', async ({ page }) => {
    // Check container width
    const container = page.locator('.schedule-page-container');
    const containerBox = await container.boundingBox();
    
    if (containerBox) {
      // Container should not be full width (has margins)
      expect(containerBox.width).toBeLessThan(await page.viewportSize()?.width || 1920);
    }
    
    // Check main calendar area
    const main = page.locator('.schedule-main');
    await expect(main).toBeVisible();
    
    // Calendar should be visible
    await expect(page.locator('.fc')).toBeVisible();
  });

  test('should handle page load without infinite loops', async ({ page }) => {
    // Navigate and wait
    await page.goto('/schedule');
    await page.waitForSelector('.dp-scheduler', { timeout: 10000 });
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Check that loading indicator is gone
    const loading = page.locator('.loading');
    const loadingCount = await loading.count();
    
    // Should not have loading indicator after initial load
    if (loadingCount > 0) {
      await expect(loading).not.toBeVisible({ timeout: 5000 });
    }
    
    // Scheduler should be stable (not constantly reloading)
    const scheduler = page.locator('.dp-scheduler');
    await expect(scheduler).toBeVisible();
  });

  test('should display state filters correctly', async ({ page }) => {
    const filtersRow = page.locator('.schedule-filters-row');
    await expect(filtersRow).toBeVisible();
    
    // Check all state filters are present
    const states = ['Навчання', 'Робота', 'Вихідний', 'Відпустка', 'Лікарняний'];
    
    for (const state of states) {
      const filter = filtersRow.locator('.state-filter-item').filter({ hasText: state });
      await expect(filter).toBeVisible();
      
      // Check checkbox exists
      const checkbox = filter.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible();
      
      // Initially should be checked
      await expect(checkbox).toBeChecked();
    }
  });

  test('should handle scheduler navigation', async ({ page }) => {
    // Wait for scheduler
    await page.waitForSelector('.dp-scheduler', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Find navigation buttons (prev/next)
    const prevButton = page.locator('.nav-btn').first();
    const nextButton = page.locator('.nav-btn').last();
    
    // Should have navigation buttons
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();
    
    // Try clicking next button
    await nextButton.click();
    await page.waitForTimeout(1000);
    // Scheduler should still be visible
    await expect(page.locator('.dp-scheduler')).toBeVisible();
    
    // Try clicking previous button
    await prevButton.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.dp-scheduler')).toBeVisible();
  });
});

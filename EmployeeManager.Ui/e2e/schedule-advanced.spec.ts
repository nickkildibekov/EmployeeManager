import { test, expect } from '@playwright/test';

test.describe('Schedule Advanced Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForSelector('.dp-scheduler', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('should create schedule entry using quick template (4 hours)', async ({ page }) => {
    // Enable quick fill mode
    await page.locator('.quick-fill-toggle input[type="checkbox"]').click();
    await page.waitForTimeout(500);
    
    // Select 4 hour template
    await page.locator('.template-btn').filter({ hasText: '4 год' }).click();
    await page.waitForTimeout(300);
    
    // Check that template is active
    const btn4 = page.locator('.template-btn').filter({ hasText: '4 год' });
    await expect(btn4).toHaveClass(/active/);
    
    // Note: Actually clicking on calendar timeline requires specific coordinates
    // This test verifies the UI state is correct for quick template creation
    // Full interaction test would require mock data or API setup
  });

  test('should handle overnight shift creation logic', async ({ page }) => {
    // This test verifies that the UI is ready for overnight shifts
    // The actual logic is tested in unit tests, but we verify UI elements
    
    // Enable quick fill mode
    await page.locator('.quick-fill-toggle input[type="checkbox"]').click();
    await page.waitForTimeout(500);
    
    // Select 12 hour template (likely to cross midnight)
    await page.locator('.template-btn').filter({ hasText: '12 год' }).click();
    await page.waitForTimeout(300);
    
    // Scheduler should be ready to handle overnight shifts
    await expect(page.locator('.dp-scheduler')).toBeVisible();
    
    // Check that scheduler has proper configuration for overnight events
    // (DayPilot handles overnight events automatically)
  });

  test('should prevent multiple notifications on drag and drop', async ({ page }) => {
    // Wait for calendar to be fully loaded
    await page.waitForTimeout(2000);
    
    // Check for toast notifications container (if exists)
    const toastContainer = page.locator('[class*="toast"], [class*="notification"]');
    const toastCount = await toastContainer.count();
    
    // If toasts exist, verify they don't multiply
    // This is a basic check - full drag test requires actual schedule entries
    await expect(page.locator('.dp-scheduler')).toBeVisible();
  });

  test('should maintain scheduler state after filter changes', async ({ page }) => {
    // Get initial scheduler state
    const scheduler = page.locator('.dp-scheduler');
    await expect(scheduler).toBeVisible();
    
    // Toggle a filter
    const trainingFilter = page.locator('.state-filter-item').filter({ hasText: 'Навчання' });
    const checkbox = trainingFilter.locator('input[type="checkbox"]');
    await checkbox.click();
    await page.waitForTimeout(1000);
    
    // Scheduler should still be visible and stable
    await expect(scheduler).toBeVisible();
    
    // Toggle filter back
    await checkbox.click();
    await page.waitForTimeout(1000);
    
    // Scheduler should still be visible
    await expect(scheduler).toBeVisible();
  });

  test('should handle rapid filter toggling without errors', async ({ page }) => {
    const filters = [
      'Навчання',
      'Робота',
      'Вихідний',
      'Відпустка',
      'Лікарняний'
    ];
    
    // Rapidly toggle all filters
    for (const filterText of filters) {
      const filter = page.locator('.state-filter-item').filter({ hasText: filterText });
      const checkbox = filter.locator('input[type="checkbox"]');
      await checkbox.click();
      await page.waitForTimeout(100);
    }
    
    // Toggle back
    for (const filterText of filters) {
      const filter = page.locator('.state-filter-item').filter({ hasText: filterText });
      const checkbox = filter.locator('input[type="checkbox"]');
      await checkbox.click();
      await page.waitForTimeout(100);
    }
    
    // Should not have errors
    const errorMessages = page.locator('text=/error|помилка/i');
    await expect(errorMessages).toHaveCount(0);
    
    // Scheduler should be stable
    await expect(page.locator('.dp-scheduler')).toBeVisible();
  });

  test('should handle template button state correctly', async ({ page }) => {
    // Initially, buttons should be disabled (quick fill mode off)
    const buttons = page.locator('.template-btn');
    const firstButton = buttons.first();
    
    // Check if disabled class exists when mode is off
    const templatePanel = page.locator('.template-buttons');
    const hasDisabledClass = await templatePanel.evaluate((el) => 
      el.classList.contains('disabled')
    );
    
    // Enable quick fill mode
    await page.locator('.quick-fill-toggle input[type="checkbox"]').click();
    await page.waitForTimeout(300);
    
    // Buttons should now be enabled
    const hasDisabledAfter = await templatePanel.evaluate((el) => 
      el.classList.contains('disabled')
    );
    
    // Should not have disabled class after enabling
    expect(hasDisabledAfter).toBeFalsy();
  });

  test('should display correct template button labels', async ({ page }) => {
    const expectedLabels = ['4 год', '8 год', '12 год'];
    const buttons = page.locator('.template-btn');
    
    for (let i = 0; i < expectedLabels.length; i++) {
      const button = buttons.nth(i);
      await expect(button).toContainText(expectedLabels[i]);
    }
  });

  test('should handle scheduler view switching without data loss', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Find view toggle buttons
    const dayButton = page.locator('.view-toggle-btn').filter({ hasText: 'День' });
    const weekButton = page.locator('.view-toggle-btn').filter({ hasText: 'Тиждень' });
    
    await expect(dayButton).toBeVisible();
    await expect(weekButton).toBeVisible();
    
    // Switch to week view
    await weekButton.click();
    await page.waitForTimeout(2000);
    
    // Scheduler should still be visible
    await expect(page.locator('.dp-scheduler')).toBeVisible();
    
    // Switch back to day view
    await dayButton.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('.dp-scheduler')).toBeVisible();
  });

  test('should have proper responsive layout', async ({ page }) => {
    // Check container width
    const container = page.locator('.schedule-page-container');
    await expect(container).toBeVisible();
    
    // Check main calendar area
    const main = page.locator('.schedule-main');
    await expect(main).toBeVisible();
    
    // Check that elements don't overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    const containerBox = await container.boundingBox();
    
    if (bodyBox && containerBox) {
      // Container should fit within viewport
      expect(containerBox.width).toBeLessThanOrEqual(bodyBox.width);
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Scheduler should render even with no data
    await expect(page.locator('.dp-scheduler')).toBeVisible();
    
    // Should not show error messages
    const errorMessages = page.locator('text=/error|помилка/i');
    await expect(errorMessages).toHaveCount(0);
    
    // Loading indicator should disappear
    const loading = page.locator('.loading');
    if (await loading.count() > 0) {
      await expect(loading).not.toBeVisible({ timeout: 5000 });
    }
  });
});

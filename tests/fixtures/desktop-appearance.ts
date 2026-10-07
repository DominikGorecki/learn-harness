import { expect, type Page } from '@playwright/test'

// Change the actual local preference through its UI, preserving the current page.
export async function setDesktopAppearance(page: Page, theme: 'Light' | 'Dark'): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('radio', { name: theme, exact: true }).check()
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase())
  const action = page.locator('.workspace-action-primary').first()
  if (await action.count()) await expect(action).toHaveCSS('color', theme === 'Light' ? 'rgb(112, 64, 181)' : 'rgb(198, 162, 250)')
}

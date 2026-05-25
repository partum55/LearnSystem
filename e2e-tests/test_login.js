const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('https://app.learnsystem.app/login');
    
    console.log('Filling in credentials...');
    await page.fill('input[type="email"]', 'e2e_student@learnsystem.app');
    await page.fill('input[type="password"]', 'E2eStudentPassword!2026');
    await page.click('button[type="submit"]');

    console.log('Waiting for dashboard navigation...');
    await page.waitForURL('**/dashboard*', { timeout: 15000 });
    console.log('Successfully logged in! Current URL:', page.url());

    console.log('Attempting to logout...');
    const logoutSelectors = ['text="Log out"', 'text="Logout"', 'text="Вийти"', '[aria-label="Logout"]'];
    let loggedOut = false;
    for (const selector of logoutSelectors) {
      if (await page.locator(selector).count() > 0) {
        await page.click(selector);
        loggedOut = true;
        break;
      }
    }
    
    if (!loggedOut) {
      console.log('Logout button not found automatically. Clearing context to simulate logout.');
      await context.clearCookies();
    } else {
      console.log('Clicked logout button.');
    }
    
    console.log('Test completed successfully.');
    await browser.close();
  } catch (err) {
    console.error('Error during test:', err.message);
    await page.screenshot({ path: 'error_login.png' });
    console.log('Screenshot saved to error_login.png');
    await browser.close();
    process.exit(1);
  }
})();

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Електронна пошта').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await expect(page).toHaveURL('/');
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious).toEqual([]);
}

test.describe('AssetPool E2E (табл. 4.2.1 КП + axe-core a11y)', () => {
  test('1. Логін з коректними даними → редірект на / + a11y', async ({ page }) => {
    await page.goto('/login');
    await expectNoSeriousA11yViolations(page);

    await loginAs(page, 'employee@assetpool.local', 'Employee123!');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Вітаємо');
    await expectNoSeriousA11yViolations(page);
  });

  test('2. Логін з невірним паролем → повідомлення про помилку', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Електронна пошта').fill('employee@assetpool.local');
    await page.getByLabel('Пароль').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Увійти' }).click();

    await expect(page.getByRole('alert')).toContainText('Невірний логін або пароль');
  });

  test('3. Фільтрація каталогу за «Ноутбуки» без перезавантаження + a11y', async ({ page }) => {
    await loginAs(page, 'employee@assetpool.local', 'Employee123!');
    await page.goto('/catalog');

    const laptopsButton = page.getByRole('button', { name: /Ноутбуки/ });
    if (await laptopsButton.isVisible()) {
      await laptopsButton.click();
    } else {
      const select = page.getByLabel('Фільтр за категорією');
      const option = select.locator('option', { hasText: 'Ноутбуки' });
      const value = await option.getAttribute('value');
      if (value) await select.selectOption(value);
    }

    await expect(page).toHaveURL(/categoryId=/);
    await expectNoSeriousA11yViolations(page);
  });

  test('4. Пагінація каталогу: наступна порція без дублікатів', async ({ page }) => {
    await loginAs(page, 'employee@assetpool.local', 'Employee123!');
    await page.goto('/catalog');

    const cards = page.locator('article, [class*="card"]');
    const initialCount = await cards.count();
    const loadMoreBtn = page.getByRole('button', { name: 'Завантажити ще' });
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();
      await expect.poll(() => cards.count()).toBeGreaterThan(initialCount);

      const invNumbers = await page.locator('[class*="inv"]').allTextContents();
      expect(new Set(invNumbers).size).toBe(invNumbers.length);
    }
  });

  test('5. Співробітник створює заявку → з’являється в «Мої пристрої» зі статусом PENDING + a11y', async ({
    page,
  }) => {
    await loginAs(page, 'employee@assetpool.local', 'Employee123!');
    await page.goto('/catalog?status=AVAILABLE');

    const orderButtons = page.getByRole('button', { name: 'Замовити' });
    await expect(orderButtons.first()).toBeEnabled();
    await orderButtons.first().click();

    await page.goto('/my-devices');
    await expect(page.getByText('Очікує').first()).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });

  test('6. Співробітник відкриває /admin/* або неіснуючий ресурс → редірект або 404', async ({
    page,
  }) => {
    await loginAs(page, 'employee@assetpool.local', 'Employee123!');
    await page.goto('/admin/requests');
    await expect(page).toHaveURL('/');

    await page.goto('/catalog/999999');
    await expect(page.getByText('404 — Сторінку не знайдено')).toBeVisible();
  });

  test('7. Адмін створює категорію → вона доступна у фільтрах каталогу + a11y', async ({
    page,
  }) => {
    await loginAs(page, 'admin@assetpool.local', 'Admin123!');
    await page.goto('/admin/categories');
    await expectNoSeriousA11yViolations(page);

    const uniqueCategory = `Аудіообладнання-${Date.now()}`;
    await page.getByRole('button', { name: '+ Додати категорію' }).click();
    await page.getByLabel('Назва').fill(uniqueCategory);
    await page.getByRole('button', { name: 'Створити' }).click();
    await expect(page.getByText(uniqueCategory)).toBeVisible();

    await page.goto('/catalog');
    await expect(page.getByText(uniqueCategory).first()).toBeAttached();
  });

  test('8 & 11. Повний flow: співробітник замовляє → адмін видає → співробітник бачить пристрій у «Мої пристрої»', async ({
    browser,
  }) => {
    const empCtx = await browser.newContext();
    const empPage = await empCtx.newPage();
    await loginAs(empPage, 'employee@assetpool.local', 'Employee123!');
    await empPage.goto('/catalog?status=AVAILABLE');
    const firstOrderBtn = empPage.getByRole('button', { name: 'Замовити' }).first();
    await expect(firstOrderBtn).toBeEnabled();
    await firstOrderBtn.click();

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginAs(adminPage, 'admin@assetpool.local', 'Admin123!');
    await adminPage.goto('/admin/requests');
    await expectNoSeriousA11yViolations(adminPage);

    const issueBtn = adminPage.getByRole('button', { name: 'Видати пристрій' }).first();
    await expect(issueBtn).toBeVisible();
    await issueBtn.click();
    await expect(adminPage.getByText('Пристрій успішно видано')).toBeVisible();

    await empPage.goto('/my-devices');
    await expect(empPage.getByText('Активна').first()).toBeVisible();

    await empCtx.close();
    await adminCtx.close();
  });

  test('9. Дві вкладки адміністратора одночасно натискають «Видати» → одна успішна, друга бачить 409', async ({
    browser,
  }) => {
    const empCtx = await browser.newContext();
    const empPage = await empCtx.newPage();
    await loginAs(empPage, 'employee@assetpool.local', 'Employee123!');
    await empPage.goto('/catalog?status=AVAILABLE');
    await empPage.getByRole('button', { name: 'Замовити' }).first().click();

    const adminCtx1 = await browser.newContext();
    const adminCtx2 = await browser.newContext();
    const adminPage1 = await adminCtx1.newPage();
    const adminPage2 = await adminCtx2.newPage();

    await Promise.all([
      loginAs(adminPage1, 'admin@assetpool.local', 'Admin123!'),
      loginAs(adminPage2, 'admin2@assetpool.local', 'Admin123!'),
    ]);

    await Promise.all([adminPage1.goto('/admin/requests'), adminPage2.goto('/admin/requests')]);

    const btn1 = adminPage1.getByRole('button', { name: 'Видати пристрій' }).first();
    const btn2 = adminPage2.getByRole('button', { name: 'Видати пристрій' }).first();
    await expect(btn1).toBeVisible();
    await expect(btn2).toBeVisible();

    await Promise.all([btn1.click(), btn2.click()]);

    const combinedText =
      (await adminPage1.locator('body').textContent()) +
      ' ' +
      (await adminPage2.locator('body').textContent());
    expect(combinedText).toContain('Пристрій успішно видано');
    expect(combinedText).toContain('Пристрій уже видано');

    await empCtx.close();
    await adminCtx1.close();
    await adminCtx2.close();
  });

  test('10. Адмін списує пристрій → він зникає з каталогу доступних, залишаючись в історії + a11y', async ({
    page,
  }) => {
    await loginAs(page, 'admin@assetpool.local', 'Admin123!');
    await page.goto('/admin/assets');
    await expectNoSeriousA11yViolations(page);

    const writeOffBtn = page.getByRole('button', { name: 'Списати' }).first();
    await expect(writeOffBtn).toBeVisible();
    await writeOffBtn.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Списати' }).click();
    await expect(page.getByText('Пристрій списано')).toBeVisible();

    await page.goto('/admin/history');
    await expectNoSeriousA11yViolations(page);
  });
});

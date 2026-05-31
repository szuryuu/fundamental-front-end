const { colors } = require("../../utils");

module.exports = async function runCriteria3(page, report) {
  try {
    console.log(
      `${colors.cyan}> Testing Criteria 3: Interactive Features...${colors.reset}`,
    );

    const expenseItems = page.locator(
      '[data-testid="expenseList"] [data-testid="transactionItem"]',
    );
    const incomeItems = page.locator(
      '[data-testid="incomeList"] [data-testid="transactionItem"]',
    );
    const changeTypeBtn = expenseItems
      .first()
      .locator('[data-testid="transactionItemEditTypeButton"]');

    if (
      (await changeTypeBtn.count()) > 0 &&
      (await changeTypeBtn.isVisible())
    ) {
      await changeTypeBtn.click();
      await page.waitForTimeout(500);
      if ((await incomeItems.count()) >= 2) {
        report.mandatory["Criteria 3 Basic: Change Type"] = true;
      }
    }

    const searchInput = page.locator(
      '[data-testid="searchTransactionFormTitleInput"]',
    );

    await searchInput.fill("Gaji Bulanan");
    await searchInput.dispatchEvent("input");
    await page.waitForTimeout(500);

    const visibleItemsAfterSearch = await page
      .locator('[data-testid="transactionItem"]:visible')
      .count();
    if (visibleItemsAfterSearch === 1) {
      report.mandatory["Criteria 3 Skilled: Search Filter"] = true;
    }

    await searchInput.fill("");
    await searchInput.dispatchEvent("input");
    await page.waitForTimeout(500);

    const visibleItemsAfterClear = await page
      .locator('[data-testid="transactionItem"]:visible')
      .count();
    if (visibleItemsAfterClear > 1) {
      report.mandatory["Criteria 3 Advanced: Empty Search Restore"] = true;
    }
  } catch (e) {
    console.error(
      `${colors.red}> [FAIL] Criteria 3 crashed: ${e.message.split("\n")[0]}${colors.reset}`,
    );
  }
};

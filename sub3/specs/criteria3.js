const { colors } = require("../../utils");

module.exports = async function runCriteria3(page, report) {
  try {
    console.log(
      `${colors.cyan}> Testing Criteria 3: Interactive Features...${colors.reset}`,
    );

    let changeTypeBtn = page
      .locator(
        '[data-testid="expenseList"] [data-testid="transactionItemEditTypeButton"]',
      )
      .first();
    if ((await changeTypeBtn.count()) === 0) {
      changeTypeBtn = page
        .locator('[data-testid="expenseList"] button')
        .filter({ hasText: /ubah tipe|pindah/i })
        .first();
    }

    if (
      (await changeTypeBtn.count()) > 0 &&
      (await changeTypeBtn.isVisible())
    ) {
      await changeTypeBtn.click();
      await page.waitForTimeout(500);

      let incomeCount = await page
        .locator('[data-testid="incomeList"] [data-testid="transactionItem"]')
        .count();
      if (incomeCount === 0) {
        incomeCount = await page
          .locator('[data-testid="incomeList"] > *')
          .count();
      }

      if (incomeCount >= 2) {
        report.mandatory["Criteria 3 Basic: Change Type"] = true;
      }
    }

    const searchInput = page.locator(
      '[data-testid="searchTransactionFormTitleInput"]',
    );

    const getVisibleCards = async () => {
      let count = await page
        .locator('[data-testid="transactionItem"]:visible')
        .count();
      if (count === 0) {
        const inc = await page
          .locator('[data-testid="incomeList"] > *:visible')
          .count();
        const exp = await page
          .locator('[data-testid="expenseList"] > *:visible')
          .count();
        count = inc + exp;
      }
      return count;
    };

    await searchInput.fill("Gaji Bulanan");
    await searchInput.dispatchEvent("input");
    await page.waitForTimeout(500);

    const visibleItemsAfterSearch = await getVisibleCards();
    if (visibleItemsAfterSearch === 1) {
      report.mandatory["Criteria 3 Skilled: Search Filter"] = true;
    }

    await searchInput.fill("");
    await searchInput.dispatchEvent("input");
    await page.waitForTimeout(500);

    const visibleItemsAfterClear = await getVisibleCards();
    if (visibleItemsAfterClear > 1) {
      report.mandatory["Criteria 3 Advanced: Empty Search Restore"] = true;
    }
  } catch (e) {
    console.error(
      `${colors.red}> [FAIL] Criteria 3 crashed: ${e.message.split("\n")[0]}${colors.reset}`,
    );
  }
};

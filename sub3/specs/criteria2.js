const { colors } = require("../../utils");

module.exports = async function runCriteria2(page, report) {
  try {
    console.log(
      `${colors.cyan}> Testing Criteria 2: Web Storage & Data Mutation...${colors.reset}`,
    );

    const lsData = await page.evaluate(() => JSON.stringify(localStorage));
    if (
      lsData &&
      lsData.includes("Gaji Bulanan") &&
      lsData.includes("Beli Makan")
    ) {
      report.mandatory["Criteria 2 Basic: LocalStorage & Delete"] = true;
    }

    const titleInput = page.locator(
      '[data-testid="transactionFormTitleInput"]',
    );
    const submitBtn = page.locator(
      '[data-testid="transactionFormSubmitButton"]',
    );

    const editBtns = page
      .locator('[data-testid="transactionItem"] button')
      .filter({ hasText: /edit|ubah/i });
    for (let i = 0; i < (await editBtns.count()); i++) {
      const btn = editBtns.nth(i);
      const btnText = await btn.innerText();
      if (btnText.toLowerCase() !== "ubah tipe") {
        await btn.click();
        await page.waitForTimeout(500);
        const filledTitle = await titleInput.inputValue();
        if (filledTitle.length > 0) {
          report.mandatory["Criteria 2 Skilled: Edit Functionality"] = true;
          await titleInput.fill(filledTitle + " Edited");
          await submitBtn.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    }

    const deleteBtn = page
      .locator('[data-testid="transactionItemDeleteButton"]')
      .first();
    if ((await deleteBtn.count()) > 0 && (await deleteBtn.isVisible())) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const lsDataAfterDelete = await page.evaluate(() =>
        JSON.stringify(localStorage),
      );

      if (
        !lsDataAfterDelete.includes("Gaji Bulanan Edited") &&
        !lsDataAfterDelete.includes("Beli Makan")
      ) {
        report.mandatory["Criteria 2 Basic: LocalStorage & Delete"] = true;
      } else if (
        !lsDataAfterDelete.includes("Beli Makan") ||
        !lsDataAfterDelete.includes("Gaji Bulanan Edited")
      ) {
        report.mandatory["Criteria 2 Basic: LocalStorage & Delete"] = true;
      }
    }
  } catch (e) {
    console.error(
      `${colors.red}> [FAIL] Criteria 2 crashed: ${e.message.split("\n")[0]}${colors.reset}`,
    );
  }
};

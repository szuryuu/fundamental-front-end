const { colors } = require("../../utils");

module.exports = async function runCriteria1(page, report) {
  try {
    console.log(
      `${colors.cyan}> Testing Criteria 1: DOM, Validation, & Dashboard...${colors.reset}`,
    );

    const dynamicDate = await page.evaluate(() => {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    });

    let alertTriggered = false;
    const dialogHandler = async (dialog) => {
      alertTriggered = true;
      await dialog.accept();
    };
    page.on("dialog", dialogHandler);

    const titleInput = page.locator(
      '[data-testid="transactionFormTitleInput"]',
    );
    const amountInput = page.locator(
      '[data-testid="transactionFormAmountInput"]',
    );
    const dateInput = page.locator('[data-testid="transactionFormDateInput"]');
    const typeSelect = page.locator(
      '[data-testid="transactionFormTypeSelect"]',
    );
    const submitBtn = page.locator(
      '[data-testid="transactionFormSubmitButton"]',
    );

    alertTriggered = false;
    await titleInput.fill("");
    await amountInput.fill("10000");
    await dateInput.fill(dynamicDate);
    const isTitleHtml5Invalid = !(await titleInput.evaluate((el) =>
      el.checkValidity(),
    ));
    await submitBtn.click({ force: true });
    const titleAlert = alertTriggered;

    alertTriggered = false;
    await titleInput.fill("Test Valid");
    await amountInput.fill("0");
    const isAmountHtml5Invalid = !(await amountInput.evaluate((el) =>
      el.checkValidity(),
    ));
    await submitBtn.click({ force: true });
    const amountAlert = alertTriggered;

    if (
      titleAlert ||
      isTitleHtml5Invalid ||
      amountAlert ||
      isAmountHtml5Invalid
    ) {
      report.mandatory["Criteria 1 Skilled: Input Validation"] = true;
    }

    page.off("dialog", dialogHandler);

    await titleInput.fill("Gaji Bulanan");
    await amountInput.fill("5000000");
    await dateInput.fill(dynamicDate);
    await typeSelect.selectOption("income");
    await submitBtn.click();
    await page.waitForTimeout(500);

    await titleInput.fill("Beli Makan");
    await amountInput.fill("50000");
    await dateInput.fill(dynamicDate);
    await typeSelect.selectOption("expense");
    await submitBtn.click();
    await page.waitForTimeout(500);

    const incomeItems = page.locator(
      '[data-testid="incomeList"] [data-testid="transactionItem"]',
    );
    const expenseItems = page.locator(
      '[data-testid="expenseList"] [data-testid="transactionItem"]',
    );

    if ((await incomeItems.count()) > 0 && (await expenseItems.count()) > 0) {
      report.mandatory["Criteria 1 Basic: Render DOM & Lists"] = true;

      const firstCard = incomeItems.first();
      const requiredTestIds = [
        "transactionItemTitle",
        "transactionItemAmount",
        "transactionItemDate",
        "transactionItemType",
        "transactionItemEditTypeButton",
        "transactionItemDeleteButton",
      ];

      const missingIds = [];

      for (const tId of requiredTestIds) {
        if ((await firstCard.locator(`[data-testid="${tId}"]`).count()) === 0) {
          missingIds.push(tId);
        }
      }

      if (missingIds.length > 0) {
        const msg = `Elemen kartu transaksi kehilangan atribut data-testid: ${missingIds.join(", ")}`;
        console.error(`${colors.red}  [-] REJECT: ${msg}${colors.reset}`);
        report.rejected.push(msg);
      }
    }

    const summaryText = await page
      .locator(".tracker-summary")
      .innerText()
      .catch(() => "");
    const plainSummary = summaryText.replace(/[^0-9]/g, "");
    if (
      plainSummary.includes("5000000") &&
      plainSummary.includes("50000") &&
      plainSummary.includes("4950000")
    ) {
      report.mandatory["Criteria 1 Advanced: Dynamic Dashboard"] = true;
    }
  } catch (e) {
    console.error(
      `${colors.red}> [FAIL] Criteria 1 crashed: ${e.message.split("\n")[0]}${colors.reset}`,
    );
  }
};

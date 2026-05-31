module.exports = async function runCriteria1(page, report) {
  try {
    console.log(`> Testing Criteria 1: DOM, Validation, & Dashboard...`);

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
    await dateInput.fill("2026-05-31");
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
    await dateInput.fill("2026-05-31");
    await typeSelect.selectOption("income");
    await submitBtn.click();
    await page.waitForTimeout(500);

    await titleInput.fill("Beli Makan");
    await amountInput.fill("50000");
    await dateInput.fill("2026-05-31");
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
    console.error(`> [FAIL] Criteria 1 crashed: ${e.message.split("\n")[0]}`);
  }
};

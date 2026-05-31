const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { runCommand, printSummaryReport } = require("./utils");

async function runSub3Tests(targetDir) {
  let isRejected = false;

  const report = {
    mandatory: {
      "Criteria 1 Basic: Render DOM & Lists": false,
      "Criteria 1 Skilled: Input Validation": false,
      "Criteria 1 Advanced: Dynamic Dashboard": false,
      "Criteria 2 Basic: LocalStorage & Delete": false,
      "Criteria 2 Skilled: Edit Functionality": false,
      "Criteria 2 Advanced: Custom Event Dispatch": false,
      "Criteria 3 Basic: Change Type": false,
      "Criteria 3 Skilled: Search Filter": false,
      "Criteria 3 Advanced: Empty Search Restore": false,
    },
    optional: {},
  };

  runCommand("npm init -y && npm install live-server", targetDir);
  const serverProcess = spawn("npx live-server --port=8080 --no-browser", {
    cwd: targetDir,
    detached: true,
    shell: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let alertTriggered = false;
  page.on("dialog", async (dialog) => {
    alertTriggered = true;
    await dialog.accept();
  });

  try {
    await page.exposeFunction("trackCustomEvent", () => {
      report.mandatory["Criteria 2 Advanced: Custom Event Dispatch"] = true;
    });

    await page.addInitScript(() => {
      const originalDispatch = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function (event) {
        if (
          event &&
          event.type &&
          ![
            "click",
            "input",
            "submit",
            "change",
            "focus",
            "blur",
            "pointerdown",
            "pointerup",
            "keydown",
            "keyup",
          ].includes(event.type)
        ) {
          window.trackCustomEvent();
        }
        return originalDispatch.apply(this, arguments);
      };
    });

    await page.goto("http://localhost:8080");
    await page.waitForLoadState("networkidle");

    const greetingText = await page
      .locator(".tracker-header__greeting")
      .innerText()
      .catch(() => "");
    if (greetingText.includes("Siswa Front-End")) {
      isRejected = true;
    }

    const reqTestIds = ["transactionForm", "incomeList", "expenseList"];
    for (const tId of reqTestIds) {
      const el = page.locator(`[data-testid="${tId}"]`).first();
      if (!(await el.isVisible())) isRejected = true;
    }

    if (isRejected) {
      console.error(
        "\n❌ [FATAL] Submission Rejected: Missing Test IDs or Greeting Name unchanged.",
      );
      process.exitCode = 1;
      printSummaryReport(report);
      return;
    }

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
    await submitBtn.click({ force: true });
    const titleAlert = alertTriggered;

    alertTriggered = false;
    await titleInput.fill("Test Valid");
    await amountInput.fill("0");
    await submitBtn.click({ force: true });
    const amountAlert = alertTriggered;

    if (titleAlert || amountAlert) {
      report.mandatory["Criteria 1 Skilled: Input Validation"] = true;
    }

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

    const lsData = await page.evaluate(() => JSON.stringify(localStorage));
    if (
      lsData &&
      lsData.includes("Gaji Bulanan") &&
      lsData.includes("Beli Makan")
    ) {
      report.mandatory["Criteria 2 Basic: LocalStorage & Delete"] = true;
    }

    const changeTypeBtn = expenseItems
      .first()
      .locator('[data-testid="transactionItemEditTypeButton"]');
    if (await changeTypeBtn.isVisible()) {
      await changeTypeBtn.click();
      await page.waitForTimeout(500);
      if ((await incomeItems.count()) === 2) {
        report.mandatory["Criteria 3 Basic: Change Type"] = true;
      }
    }

    const searchInput = page.locator(
      '[data-testid="searchTransactionFormTitleInput"]',
    );
    const searchBtn = page.locator(
      '[data-testid="searchTransactionFormSubmitButton"]',
    );

    await searchInput.fill("Gaji Bulanan");
    await searchInput.dispatchEvent("input");
    await searchBtn.click();
    await page.waitForTimeout(500);

    const visibleItemsAfterSearch = await page
      .locator('[data-testid="transactionItem"]')
      .count();
    if (visibleItemsAfterSearch === 1) {
      report.mandatory["Criteria 3 Skilled: Search Filter"] = true;
    }

    await searchInput.fill("");
    await searchInput.dispatchEvent("input");
    await searchBtn.click();
    await page.waitForTimeout(500);

    if ((await page.locator('[data-testid="transactionItem"]').count()) > 1) {
      report.mandatory["Criteria 3 Advanced: Empty Search Restore"] = true;
    }

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
    if (await deleteBtn.isVisible()) {
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

    printSummaryReport(report);
  } catch (e) {
    console.error(`\n❌ [FATAL] E2E Crash: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
    try {
      process.kill(-serverProcess.pid);
    } catch (killError) {}
  }
}

module.exports = { runSub3Tests };

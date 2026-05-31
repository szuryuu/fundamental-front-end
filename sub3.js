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

  console.log(`> Executing: npm init -y && npm install live-server`);
  runCommand("npm init -y && npm install live-server", targetDir);

  console.log(`> Starting live-server...`);
  const serverProcess = spawn("npx live-server --port=8080 --no-browser", {
    cwd: targetDir,
    detached: true,
    shell: true,
  });

  let dynamicUrl = "http://127.0.0.1:8080";
  const urlRegex = /http:\/\/(?:127\.0\.0\.1|localhost):\d+/i;

  serverProcess.stdout.on("data", (data) => {
    const str = data.toString();
    const match = str.match(urlRegex);
    if (match) dynamicUrl = match[0];
  });

  await new Promise((resolve) => setTimeout(resolve, 4000));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set timeout singkat agar tidak tersangkut lama jika elemen tidak ada
  page.setDefaultTimeout(5000);

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

    console.log(`> Navigating to ${dynamicUrl}...`);
    await page.goto(dynamicUrl);
    await page.waitForLoadState("networkidle");

    console.log(`> Validating Reject Criteria: Greeting Name...`);
    try {
      await page.waitForSelector(".tracker-header__greeting", {
        state: "attached",
      });
      const greetingText = await page
        .locator(".tracker-header__greeting")
        .innerText();
      if (greetingText.includes("Siswa Front-End")) {
        console.error(
          '❌ [REJECT] Teks "Siswa Front-End" belum diganti oleh siswa.',
        );
        isRejected = true;
      }
    } catch (e) {
      console.error(
        "❌ [REJECT] Elemen .tracker-header__greeting tidak ditemukan di DOM.",
      );
      isRejected = true;
    }

    console.log(`> Validating Reject Criteria: test-ids...`);
    const reqTestIds = ["transactionForm", "incomeList", "expenseList"];
    for (const tId of reqTestIds) {
      try {
        await page.waitForSelector(`[data-testid="${tId}"]`, {
          state: "attached",
        });
      } catch (e) {
        console.error(
          `❌ [REJECT] Elemen krusial dengan data-testid="${tId}" tidak ditemukan.`,
        );
        isRejected = true;
      }
    }

    if (isRejected) {
      console.error(
        "\n⚠️ [WARNING] Submission contains REJECT criteria. Marking as failed but continuing E2E testing for full feedback...",
      );
      process.exitCode = 1;
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

    // SEGMENT: Input Validation
    try {
      console.log(`> Testing Input Validation (Criteria 1 Skilled)...`);
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
    } catch (e) {
      console.error(
        `> [FAIL] Input Validation test crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // SEGMENT: Inject Data (Prerequisite for other tests)
    try {
      console.log(`> Injecting Dummy Transactions...`);
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
    } catch (e) {
      console.error(
        `> [FAIL] Inject Data crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // SEGMENT: Render & Dashboard
    try {
      console.log(`> Testing Render DOM & Dashboard...`);
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
    } catch (e) {
      console.error(
        `> [FAIL] Render & Dashboard test crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // SEGMENT: Change Type
    try {
      console.log(`> Testing Change Type...`);
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
    } catch (e) {
      console.error(
        `> [FAIL] Change Type test crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // SEGMENT: Search Filter
    try {
      console.log(`> Testing Search Filter...`);
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
        `> [FAIL] Search Filter test crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // SEGMENT: Edit Functionality
    try {
      console.log(`> Testing Edit Functionality...`);
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
    } catch (e) {
      console.error(
        `> [FAIL] Edit Functionality test crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // SEGMENT: Delete Functionality
    try {
      console.log(`> Testing Delete Functionality...`);
      const deleteBtn = page
        .locator('[data-testid="transactionItemDeleteButton"]')
        .first();
      if ((await deleteBtn.count()) > 0 && (await deleteBtn.isVisible())) {
        await deleteBtn.click();
        await page.waitForTimeout(500);
        const lsDataAfterDelete = await page.evaluate(() =>
          JSON.stringify(localStorage),
        );

        // Cek apakah data yang diedit atau data awal hilang dari localStorage
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
        `> [FAIL] Delete Functionality test crashed: ${e.message.split("\n")[0]}`,
      );
    }

    // PRINT REPORT DI AKHIR (Meskipun ada error di tengah jalan)
    printSummaryReport(report);
  } catch (e) {
    // Hanya menangkap error sistematis (seperti browser terputus)
    console.error(`\n❌ [FATAL] Critical Pipeline Crash: ${e.message}`);
    process.exitCode = 1;
    printSummaryReport(report);
  } finally {
    await browser.close();
    try {
      process.kill(-serverProcess.pid);
    } catch (killError) {}
  }
}

module.exports = { runSub3Tests };

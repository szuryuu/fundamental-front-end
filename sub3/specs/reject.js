module.exports = async function validateReject(page, report) {
  let isRejected = false;

  console.log(`> Validating Reject Criteria: Greeting Name...`);
  try {
    await page.waitForSelector(".tracker-header__greeting", {
      state: "attached",
    });
    const greetingText = await page
      .locator(".tracker-header__greeting")
      .innerText();
    if (greetingText.includes("Siswa Front-End")) {
      const msg = 'Teks "Siswa Front-End" belum diganti oleh siswa.';
      console.error(`  [-] REJECT: ${msg}`);
      report.rejected.push(msg);
      isRejected = true;
    }
  } catch (e) {
    const msg = "Elemen .tracker-header__greeting tidak ditemukan di DOM.";
    console.error(`  [-] REJECT: ${msg}`);
    report.rejected.push(msg);
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
      const msg = `Elemen krusial dengan data-testid="${tId}" tidak ditemukan.`;
      console.error(`  [-] REJECT: ${msg}`);
      report.rejected.push(msg);
      isRejected = true;
    }
  }

  if (isRejected) {
    console.error(
      "\n  [!] WARNING: Submission contains REJECT criteria. Marking as failed but continuing E2E testing for full feedback...",
    );
    process.exitCode = 1;
  }
};

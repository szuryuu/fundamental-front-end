const { colors } = require("../../utils");

module.exports = async function validateReject(page, report) {
  let isRejected = false;

  console.log(
    `${colors.cyan}> Validating Reject Criteria: Greeting Name...${colors.reset}`,
  );
  try {
    await page.waitForSelector(".tracker-header__greeting", {
      state: "attached",
    });
    const greetingText = await page
      .locator(".tracker-header__greeting")
      .innerText();
    if (greetingText.includes("Siswa Front-End")) {
      const msg = 'Teks "Siswa Front-End" belum diganti oleh siswa.';
      console.error(`${colors.red}  [-] REJECT: ${msg}${colors.reset}`);
      report.rejected.push(msg);
      isRejected = true;
    }
  } catch (e) {
    const msg = "Elemen .tracker-header__greeting tidak ditemukan di DOM.";
    console.error(`${colors.red}  [-] REJECT: ${msg}${colors.reset}`);
    report.rejected.push(msg);
    isRejected = true;
  }

  console.log(
    `${colors.cyan}> Validating Reject Criteria: test-ids...${colors.reset}`,
  );
  const reqTestIds = ["transactionForm", "incomeList", "expenseList"];
  for (const tId of reqTestIds) {
    try {
      await page.waitForSelector(`[data-testid="${tId}"]`, {
        state: "attached",
      });
    } catch (e) {
      const msg = `Elemen krusial dengan data-testid="${tId}" tidak ditemukan.`;
      console.error(`${colors.red}  [-] REJECT: ${msg}${colors.reset}`);
      report.rejected.push(msg);
      isRejected = true;
    }
  }

  if (isRejected) {
    console.error(
      `\n${colors.yellow}  [!] WARNING: Submission contains REJECT criteria. Marking as failed but continuing E2E testing for full feedback...${colors.reset}`,
    );
    process.exitCode = 1;
  }
};

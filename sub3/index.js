const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const { runCommand, printSummaryReport, colors } = require("../utils");

const validateReject = require("./specs/reject");
const runCriteria1 = require("./specs/criteria1");
const runCriteria2 = require("./specs/criteria2");
const runCriteria3 = require("./specs/criteria3");

async function runSub3Tests(targetDir) {
  const report = {
    rejected: [],
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

  console.log(
    `${colors.cyan}> Executing: npm init -y && npm install live-server${colors.reset}`,
  );
  runCommand("npm init -y && npm install live-server", targetDir);

  console.log(`${colors.cyan}> Starting live-server...${colors.reset}`);
  const serverProcess = spawn("npx live-server --port=8080 --no-browser", {
    cwd: targetDir,
    detached: true,
    shell: true,
  });

  let dynamicUrl = "http://127.0.0.1:8080";
  const urlRegex = /http:\/\/(?:127\.0\.0\.1|localhost):\d+/i;

  serverProcess.stdout.on("data", (data) => {
    const match = data.toString().match(urlRegex);
    if (match) dynamicUrl = match[0];
  });

  await new Promise((resolve) => setTimeout(resolve, 4000));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(15000);

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

    console.log(
      `${colors.cyan}> Navigating to ${dynamicUrl}...${colors.reset}`,
    );
    await page.goto(dynamicUrl, { waitUntil: "domcontentloaded" });

    await validateReject(page, report);
    await runCriteria1(page, report);
    await runCriteria3(page, report);
    await runCriteria2(page, report);

    printSummaryReport(report);
  } catch (e) {
    console.error(
      `\n${colors.red}${colors.bold} [!] FATAL: Critical Pipeline Crash: ${e.message}${colors.reset}`,
    );
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

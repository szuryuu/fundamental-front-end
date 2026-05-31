const { execSync } = require("child_process");

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function runCommand(command, cwd) {
  try {
    execSync(command, { cwd, stdio: "ignore" });
  } catch (e) {}
}

function printSummaryReport(report) {
  console.log(
    `\n${colors.bold}======================================================${colors.reset}`,
  );
  console.log(`${colors.bold} FINAL AUTOMATED REVIEW SUMMARY${colors.reset}`);
  console.log(
    `${colors.bold}======================================================\n${colors.reset}`,
  );

  if (report.rejected && report.rejected.length > 0) {
    console.log(
      `${colors.red}${colors.bold} [!] SUBMISSION REJECTED - CRITICAL FAILURES [!]${colors.reset}`,
    );
    report.rejected.forEach((reason) => {
      console.log(`${colors.red}     [-] ${reason}${colors.reset}`);
    });
    console.log("");
  }

  console.log(`${colors.bold} --- MANDATORY CRITERIA ---${colors.reset}`);
  for (const [criteria, passed] of Object.entries(report.mandatory)) {
    const statusText = passed ? "[PASS]" : "[FAIL]";
    const color = passed ? colors.green : colors.red;
    console.log(
      `  ${color}${statusText.padEnd(6)}${colors.reset} | ${criteria}`,
    );
  }

  console.log(`\n${colors.bold} --- OPTIONAL SUGGESTIONS ---${colors.reset}`);
  if (report.optional && Object.keys(report.optional).length > 0) {
    for (const [criteria, passed] of Object.entries(report.optional)) {
      const statusText = passed ? "[PASS]" : "[FAIL]";
      const color = passed ? colors.green : colors.red;
      console.log(
        `  ${color}${statusText.padEnd(6)}${colors.reset} | ${criteria}`,
      );
    }
  } else {
    console.log(
      `${colors.yellow}  (No optional criteria evaluated)${colors.reset}`,
    );
  }

  console.log(
    `\n${colors.cyan} [*] NOTE: Visual aesthetics, animation smoothness, and code plagiarism still require human verification.${colors.reset}`,
  );
  console.log(
    `${colors.bold}======================================================\n${colors.reset}`,
  );
}

module.exports = { runCommand, printSummaryReport, colors };

const { execSync } = require("child_process");

function runCommand(command, cwd) {
  try {
    execSync(command, { cwd, stdio: "ignore" });
  } catch (e) {}
}

function printSummaryReport(report) {
  console.log("\n======================================================");
  console.log(" FINAL AUTOMATED REVIEW SUMMARY");
  console.log("======================================================\n");

  if (report.rejected && report.rejected.length > 0) {
    console.log(" [!] SUBMISSION REJECTED - CRITICAL FAILURES [!]");
    report.rejected.forEach((reason) => {
      console.log(`     [-] ${reason}`);
    });
    console.log("");
  }

  console.log(" --- MANDATORY CRITERIA ---");
  for (const [criteria, passed] of Object.entries(report.mandatory)) {
    const status = passed ? "[PASS]" : "[FAIL]";
    console.log(`  ${status.padEnd(6)} | ${criteria}`);
  }

  console.log("\n --- OPTIONAL SUGGESTIONS ---");
  if (report.optional && Object.keys(report.optional).length > 0) {
    for (const [criteria, passed] of Object.entries(report.optional)) {
      const status = passed ? "[PASS]" : "[FAIL]";
      console.log(`  ${status.padEnd(6)} | ${criteria}`);
    }
  } else {
    console.log("  (No optional criteria evaluated)");
  }

  console.log(
    "\n [*] NOTE: Visual aesthetics, animation smoothness, and code plagiarism still require human verification.",
  );
  console.log("======================================================\n");
}

module.exports = { runCommand, printSummaryReport };

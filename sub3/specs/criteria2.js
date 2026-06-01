const { colors } = require("../../utils");

module.exports = async function runCriteria2(page, report) {
  try {
    console.log(
      `${colors.cyan}> Testing Criteria 2: Web Storage & Data Mutation...${colors.reset}`,
    );

    const getParsedStorage = () => {
      for (let i = 0; i < localStorage.length; i++) {
        try {
          const parsed = JSON.parse(localStorage.getItem(localStorage.key(i)));
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed[0].hasOwnProperty("id")
          ) {
            return parsed;
          }
        } catch (e) {}
      }
      return [];
    };

    const lsDataString = await page.evaluate(() =>
      JSON.stringify(localStorage),
    );

    if (
      lsDataString.includes("Gaji Bulanan") &&
      lsDataString.includes("Beli Makan")
    ) {
      report.mandatory["Criteria 2 Basic: LocalStorage & Delete"] = true;
    } else {
      const msg =
        "Semua data transaksi hilang setiap kali halaman di-refresh (localStorage belum digunakan).";
      console.error(`${colors.red}  [-] REJECT: ${msg}${colors.reset}`);
      report.rejected.push(msg);
      return;
    }

    const titleInput = page.locator(
      '[data-testid="transactionFormTitleInput"]',
    );
    const submitBtn = page.locator(
      '[data-testid="transactionFormSubmitButton"]',
    );

    let editBtns = page
      .locator('[data-testid="transactionItem"] button')
      .filter({ hasText: /edit|ubah/i });
    if ((await editBtns.count()) === 0) {
      editBtns = page
        .locator(
          '[data-testid="incomeList"] button, [data-testid="expenseList"] button',
        )
        .filter({ hasText: /edit/i });
    }

    for (let i = 0; i < (await editBtns.count()); i++) {
      const btn = editBtns.nth(i);
      const btnText = await btn.innerText();
      if (btnText.toLowerCase() !== "ubah tipe") {
        const preEditData = await page.evaluate(getParsedStorage);
        const oldIds = preEditData.map((t) => t.id);

        await btn.click();
        await page.waitForTimeout(500);
        const filledTitle = await titleInput.inputValue();

        if (filledTitle.length > 0) {
          const newTitle = filledTitle + " Edited";
          await titleInput.fill(newTitle);
          await submitBtn.click();
          await page.waitForTimeout(500);

          const postEditData = await page.evaluate(getParsedStorage);
          const editedItem = postEditData.find((t) => t.title === newTitle);

          if (editedItem) {
            if (oldIds.includes(editedItem.id)) {
              report.mandatory["Criteria 2 Skilled: Edit Functionality"] = true;
            } else {
              console.error(
                `${colors.yellow}  [!] WARNING: Fitur Edit mengubah ID transaksi (Ini operasi Delete+Add, bukan Edit Sejati). Kriteria gagal.${colors.reset}`,
              );
              report.mandatory["Criteria 2 Skilled: Edit Functionality"] =
                false;
            }
          }
          break;
        }
      }
    }

    let deleteBtn = page
      .locator('[data-testid="transactionItemDeleteButton"]')
      .first();
    if ((await deleteBtn.count()) === 0) {
      deleteBtn = page
        .locator(
          '[data-testid="incomeList"] button, [data-testid="expenseList"] button',
        )
        .filter({ hasText: /hapus|delete/i })
        .first();
    }

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

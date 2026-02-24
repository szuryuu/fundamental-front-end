// sub1.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { runCommand, printSummaryReport, REQUIRED_NOTES } = require('./utils');

async function runSub1Tests(targetDir) {
    console.log(`\n======================================================`);
    console.log(`🚀 INITIATING E2E PIPELINE: SUBMISSION 1 (VANILLA JS)`);
    console.log(`======================================================\n`);
    
    const report = {
        mandatory: {
            "Criteria 1: Render 15 Notes (Title & Body)": false,
            "Criteria 2: Add Note Form Functionality": false,
            "Criteria 3: CSS Grid / Flexbox Layout Detected": false,
            "Criteria 4: Web Components (Min 3)": false
        },
        optional: {
            "Suggestion 2: Realtime Form Validation": false,
            "Suggestion 3: Custom Attributes on Web Components": false,
            "Suggestion 4: Mobile Responsiveness (No Overflow)": false
        }
    };

    runCommand('npm init -y && npm install live-server', targetDir);
    const serverProcess = spawn('npx live-server --port=8080 --no-browser', { cwd: targetDir, detached: true, shell: true });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const browser = await chromium.launch({ headless: false }); 
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:8080');
        await page.waitForLoadState('networkidle');

        console.log('--- 🔍 EXECUTING AUDITS ---');

        let foundCount = 0;
        for (const note of REQUIRED_NOTES) {
            const titleVisible = await page.getByText(note.title, { exact: false }).first().isVisible();
            const bodyVisible = await page.getByText(note.body, { exact: false }).first().isVisible();
            if (titleVisible && bodyVisible) foundCount++;
        }
        if (foundCount === 15) report.mandatory["Criteria 1: Render 15 Notes (Title & Body)"] = true;

        const titleInput = page.locator('input[type="text"], input[name="title"], #title, [placeholder*="judul" i], [placeholder*="title" i]').first();
        const bodyInput = page.locator('textarea, [name="body"], #body, [placeholder*="isi" i], [placeholder*="note" i]').first();
        const submitBtn = page.locator('button[type="submit"], form button').first();

        if (await titleInput.isVisible() && await bodyInput.isVisible() && await submitBtn.isVisible()) {
            const testTitle = `DevOps Auto Test ${Date.now()}`;
            await titleInput.fill(testTitle);
            await bodyInput.fill('Injected payload.');
            await submitBtn.click();
            
            const isNewNoteVisible = await page.getByText(testTitle).isVisible();
            if (isNewNoteVisible) report.mandatory["Criteria 2: Add Note Form Functionality"] = true;
        }

        const customComponentAudit = await page.evaluate(() => {
            const customTags = new Set();
            let hasCustomAttr = false;
            const standardAttrs = ['id', 'class', 'style', 'type', 'name', 'value', 'placeholder', 'required', 'minlength', 'maxlength'];

            function scanNode(node) {
                if (node.tagName && node.tagName.includes('-')) {
                    customTags.add(node.tagName.toLowerCase());
                    Array.from(node.attributes).forEach(attr => {
                        if (!standardAttrs.includes(attr.name.toLowerCase())) hasCustomAttr = true;
                    });
                }
                if (node.shadowRoot) node.shadowRoot.childNodes.forEach(scanNode);
                node.childNodes.forEach(scanNode);
            }
            scanNode(document.body);
            return { tags: Array.from(customTags), hasCustomAttr };
        });

        if (customComponentAudit.tags.length >= 3) report.mandatory["Criteria 4: Web Components (Min 3)"] = true;
        if (customComponentAudit.hasCustomAttr) report.optional["Suggestion 3: Custom Attributes on Web Components"] = true;

        const hasGrid = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
                if (window.getComputedStyle(el).display === 'grid' || window.getComputedStyle(el).display === 'flex') return true;
            }
            return false;
        });
        if (hasGrid) report.mandatory["Criteria 3: CSS Grid / Flexbox Layout Detected"] = true;

        if (await titleInput.isVisible()) {
            const hasHTML5Validation = await titleInput.evaluate(el => el.hasAttribute('required') || el.hasAttribute('minlength'));
            await titleInput.fill('');
            await titleInput.type('a'); 
            const isValid = await titleInput.evaluate(el => el.validity.valid);
            const validationMsg = await titleInput.evaluate(el => el.validationMessage);

            if (hasHTML5Validation || !isValid || validationMsg !== '') {
                report.optional["Suggestion 2: Realtime Form Validation"] = true;
            }
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(1000); 
        const isResponsive = await page.evaluate(() => {
            return document.documentElement.scrollWidth <= window.innerWidth;
        });
        if (isResponsive) report.optional["Suggestion 4: Mobile Responsiveness (No Overflow)"] = true;

        printSummaryReport(report);

    } catch (e) {
        console.error(`\n❌ [FATAL] E2E Crash: ${e.message}`);
        process.exitCode = 1; 
    } finally {
        await browser.close();
        try { process.kill(-serverProcess.pid); } catch (killError) {}
        console.log('🛑 [SYSTEM] Environment terminated.');
    }
}

module.exports = { runSub1Tests };

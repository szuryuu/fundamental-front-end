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
            "Criteria 3: CSS Grid Layout Detected": false,
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
        
        console.log('> ⏳ Stabilizing DOM and waiting for asynchronous renders...');
        await page.waitForTimeout(2500); 
        await page.waitForLoadState('networkidle');

        console.log('--- 🔍 EXECUTING AUDITS ---');

        let foundCount = 0;
        for (const note of REQUIRED_NOTES) {
            const titleVisible = await page.getByText(note.title, { exact: false }).first().isVisible();
            const bodyVisible = await page.getByText(note.body, { exact: false }).first().isVisible();
            if (titleVisible && bodyVisible) foundCount++;
        }
        if (foundCount === 15) report.mandatory["Criteria 1: Render 15 Notes (Title & Body)"] = true;

        let titleInput = null, bodyInput = null, submitBtn = null;
        
        // THE FIX: Strict exclusion of search-related inputs
        const titleSelectors = [
            'note-form input', 
            '#title',
            'input[name="title"]', 
            '[placeholder*="judul" i]', 
            '[placeholder*="title" i]', 
            'input[type="text"]:not([placeholder*="cari" i]):not([placeholder*="search" i]):not([id*="search" i]):not([class*="search" i])', 
            'input:not([type="search"]):not([id*="search" i]):not([class*="search" i]):not([placeholder*="cari" i])'
        ];
        for (const sel of titleSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible().catch(()=>false)) { titleInput = el; break; }
        }

        const bodySelectors = ['note-form textarea', '#body', 'textarea[name="body"]', '[placeholder*="isi" i]', '[placeholder*="note" i]', 'textarea'];
        for (const sel of bodySelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible().catch(()=>false)) { bodyInput = el; break; }
        }

        const submitSelectors = [
            'note-form button[type="submit"]', 'note-form button', 'button[type="submit"]',
            'button:has-text("Tambah")', 'button:has-text("Simpan")', 'button:has-text("Add")', 'button:has-text("Submit")',
            'form button:not([type="reset"]):not([type="button"]):not(:has-text("Batal")):not(:has-text("Bersih"))',
            'form button'
        ];
        for (const sel of submitSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible()) {
                submitBtn = btn;
                break;
            }
        }

        if (titleInput && bodyInput) {
            const titleTag = await titleInput.evaluate(el => el.tagName.toLowerCase());
            const bodyTag = await bodyInput.evaluate(el => el.tagName.toLowerCase());

            if (titleTag === 'input' && bodyTag === 'textarea') {
                report.mandatory["Criteria 2: Add Note Form Functionality"] = true;
            } else {
                report.mandatory["Criteria 2: Add Note Form Functionality"] = `FAIL: Tag tidak sesuai (Judul: <${titleTag}>, Isi: <${bodyTag}>)`;
            }
        } else {
            report.mandatory["Criteria 2: Add Note Form Functionality"] = "FAIL: Input/Textarea form tidak terdeteksi";
        }

        if (titleInput) {
            const hasHTML5Validation = await titleInput.evaluate(el => el.hasAttribute('required') || el.hasAttribute('minlength'));
            
            await titleInput.fill('');
            await titleInput.type('a'); 
            await titleInput.evaluate(el => el.dispatchEvent(new Event('blur')));
            await page.waitForTimeout(500); 
            
            const isValid = await titleInput.evaluate(el => el.validity.valid);
            
            const hasCustomError = await page.evaluate(() => {
                const html = document.body.innerHTML.toLowerCase();
                return html.includes('tidak boleh kosong') || html.includes('harus diisi') || html.includes('wajib diisi') || html.includes('minimal') || html.includes('karakter');
            });

            if (hasHTML5Validation || !isValid || hasCustomError) {
                report.optional["Suggestion 2: Realtime Form Validation"] = true;
            }
        }

        if (titleInput && bodyInput && submitBtn) {
            console.log('> 🧪 Injecting dummy note to force component rendering (e.g., <note-item>)...');
            await titleInput.fill(`Test Note ${Date.now()}`);
            await bodyInput.fill('This is a test note to trigger element creation.');
            await submitBtn.click({ force: true });
            await page.waitForTimeout(1500); 
        }

        const customComponentAudit = await page.evaluate(() => {
            const customTags = new Set();
            let hasCustomAttr = false;
            const standardAttrs = ['id', 'class', 'style', 'type', 'name', 'value', 'placeholder', 'required', 'minlength', 'maxlength'];

            function scanNode(node) {
                if (node.tagName && node.tagName.includes('-')) {
                    customTags.add(`<${node.tagName.toLowerCase()}>`);
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

        if (customComponentAudit.tags.length >= 3) {
            report.mandatory["Criteria 4: Web Components (Min 3)"] = `PASS: Found ${customComponentAudit.tags.join(', ')}`;
        } else {
            report.mandatory["Criteria 4: Web Components (Min 3)"] = `FAIL: Only found ${customComponentAudit.tags.length} (${customComponentAudit.tags.join(', ') || 'None'})`;
        }

        if (customComponentAudit.hasCustomAttr) report.optional["Suggestion 3: Custom Attributes on Web Components"] = true;

        // THE FIX: Incorporating <slot> awareness and "card" keywords
        const gridInfo = await page.evaluate(() => {
            let foundGridContext = null;
            function scanNode(node) {
                if (!node || node.nodeType !== 1 || foundGridContext) return;
                
                const style = window.getComputedStyle(node);
                
                if (style.display === 'grid' || style.display === 'inline-grid') {
                    const childTags = Array.from(node.children).map(c => c.tagName.toLowerCase());
                    const childrenCount = childTags.filter(t => !['style', 'script', 'template'].includes(t)).length;
                    const hasSlot = childTags.includes('slot');
                    
                    const id = (node.id || '').toLowerCase();
                    const className = (typeof node.className === 'string' ? node.className : '').toLowerCase();
                    const tag = node.tagName.toLowerCase();

                    if (tag !== 'body' && tag !== 'html' && tag !== 'main') {
                        if (childrenCount >= 2 || hasSlot || 
                            id.includes('list') || id.includes('note') || id.includes('container') || id.includes('grid') || id.includes('card') ||
                            className.includes('list') || className.includes('note') || className.includes('container') || className.includes('grid') || className.includes('card') ||
                            tag.includes('list') || tag.includes('grid') || tag.includes('card')) {
                            
                            let descriptor = tag;
                            if (node.id) descriptor += `#${node.id}`;
                            if (typeof node.className === 'string' && node.className.trim() !== '') {
                                descriptor += `.${node.className.trim().replace(/\s+/g, '.')}`;
                            }
                            foundGridContext = descriptor;
                        }
                    }
                }
                
                if (node.shadowRoot) scanNode(node.shadowRoot);
                Array.from(node.children).forEach(scanNode);
            }
            scanNode(document.body);
            return foundGridContext;
        });

        if (gridInfo) {
            report.mandatory["Criteria 3: CSS Grid Layout Detected"] = `PASS: Applied on ${gridInfo}`;
        } else {
            report.mandatory["Criteria 3: CSS Grid Layout Detected"] = "FAIL: List is not using CSS Grid";
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

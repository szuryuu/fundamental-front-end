// sub2.js
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { runCommand, printSummaryReport } = require('./utils');

async function runSub2Tests(targetDir) {
    console.log(`\n======================================================`);
    console.log(`🚀 INITIATING E2E PIPELINE: SUBMISSION 2 (REST API & WEBPACK)`);
    console.log(`======================================================\n`);
    
    const report = {
        mandatory: {
            "Criteria 1.1: Inherited Sub 1 Form Functionality": false,
            "Criteria 1.2: Inherited Sub 1 Web Components (Min 3)": false,
            "Criteria 1.3: Inherited Sub 1 CSS Grid Layout": false,
            "Criteria 2: REST API Integrated (GET, POST, DELETE)": false,
            "Criteria 3: Webpack Bundler & Dev Server Configured": false,
            "Criteria 4: Fetch API Implementation": false,
            "Criteria 5: Loading Indicator Rendered": false
        },
        optional: {
            "Suggestion 1: Archive & Unarchive Implementation": false,
            "Suggestion 2: Error Feedback Handled": false,
            "Suggestion 3: Animation": false,
            "Suggestion 4: Prettier Formatter Configured": false
        }
    };

    console.log('--- 🔍 STATIC ENVIRONMENT ANALYSIS ---');
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        if (pkg.scripts && pkg.scripts['start-dev'] && pkg.scripts['build']) {
            console.log('✅ [PASS] Strict rubric check: "start-dev" and "build" scripts exist.');
        } else {
            console.log('❌ [FAIL] Strict rubric check: Missing "start-dev" or "build" script in package.json.');
        }

        if (pkg.devDependencies && (pkg.devDependencies.webpack || pkg.devDependencies['webpack-dev-server'])) {
            report.mandatory["Criteria 3: Webpack Bundler & Dev Server Configured"] = true;
        }

        const hasPrettierDep = pkg.devDependencies && pkg.devDependencies.prettier;
        const hasPrettierRc = fs.existsSync(path.join(targetDir, '.prettierrc')) || fs.existsSync(path.join(targetDir, '.prettierrc.json'));
        if (hasPrettierDep && hasPrettierRc) {
            report.optional["Suggestion 4: Prettier Formatter Configured"] = true;
        }

        const animLibs = ['animejs', 'gsap', 'aos', 'framer-motion', 'motion'];
        let foundLib = null;
        if (pkg.dependencies) foundLib = animLibs.find(lib => pkg.dependencies[lib]);
        if (!foundLib && pkg.devDependencies) foundLib = animLibs.find(lib => pkg.devDependencies[lib]);

        if (foundLib) {
            console.log(`ℹ️ [INFO] Suggestion 3: '${foundLib}' library detected in package.json.`);
            report.optional["Suggestion 3: Animation"] = `INFO: ${foundLib} detected in package.json`;
        } else {
            try {
                const grepCmd = `grep -rnE --include="*.css" --include="*.js" --include="*.html" --exclude-dir="node_modules" --exclude-dir="dist" "transition:|@keyframes|transform:" . | head -n 1`;
                const cssGrep = execSync(grepCmd, { cwd: targetDir, encoding: 'utf8' }).trim();
                
                if (cssGrep) {
                    const parts = cssGrep.split(':');
                    let file = parts[0].replace('./', ''); 
                    
                    let keyword = "animation/transition";
                    if (cssGrep.includes('transition:')) keyword = 'transition';
                    else if (cssGrep.includes('@keyframes')) keyword = '@keyframes';
                    else if (cssGrep.includes('transform:')) keyword = 'transform';

                    console.log(`ℹ️ [INFO] Suggestion 3: '${keyword}' detected in ${file}.`);
                    report.optional["Suggestion 3: Animation"] = `INFO: ${keyword} detected in ${file}`;
                }
            } catch(e) {}
        }
    }

    try {
        const grepCmd = `grep -r --exclude-dir="node_modules" --exclude-dir="dist" "fetch(" . || echo "NOT_FOUND"`;
        const fetchCheck = execSync(grepCmd, { cwd: targetDir, encoding: 'utf8' });
        if (!fetchCheck.includes("NOT_FOUND")) {
            report.mandatory["Criteria 4: Fetch API Implementation"] = true;
        }
    } catch (e) {}

    console.log('\n--- ⚙️ COMPILING PRODUCTION BUILD ---');
    console.log('> Executing: npm install');
    const installResult = runCommand('npm install', targetDir);
    if (!installResult) console.log('⚠️ [WARNING] npm install reported warnings or errors. Proceeding anyway...');
    
    console.log('> Executing: npm run build');
    const buildResult = runCommand('npm run build', targetDir);
    if (!buildResult) {
        console.error('❌ [FATAL] Criteria 3: Production compilation failed. VERDICT: REJECT.');
        report.mandatory["Criteria 3: Webpack Bundler & Dev Server Configured"] = false;
        printSummaryReport(report);
        process.exitCode = 1;
        return;
    }
    
    console.log('> Initializing Webpack Dev Server. Forcing Port 8080 to bypass Linux EACCES restrictions...');
    const serverProcess = spawn('npm run start-dev -- --port 8080', { 
        cwd: targetDir, 
        detached: true, 
        shell: true,
        env: { ...process.env, PORT: '8080' } 
    });
    
    let dynamicUrl = 'http://localhost:8080';
    const urlRegex = /http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/i;

    serverProcess.stdout.on('data', (data) => {
        const str = data.toString();
        process.stdout.write(`[DEV-SERVER] ${str}`);
        const match = str.match(urlRegex);
        if (match) dynamicUrl = match[0];
    });

    serverProcess.stderr.on('data', (data) => {
        const str = data.toString();
        process.stderr.write(`[DEV-SERVER ERR] ${str}`);
        const match = str.match(urlRegex);
        if (match) dynamicUrl = match[0];
    });
    
    await new Promise(resolve => setTimeout(resolve, 10000)); 

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let apiStats = { get: false, post: false, delete: false, archive: false, unarchive: false };
    let loadingStats = { get: false, post: false, delete: false, archive: false, unarchive: false };
    let isErrorTestDone = false; 
    let isPurging = false;

    await page.route('**/*', async route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('notes-api.dicoding.dev/v2/notes')) {
            if (isPurging) return route.continue();

            let action = 'get';
            if (method === 'POST') {
                if (url.includes('archive') && !url.includes('unarchive')) action = 'archive';
                else if (url.includes('unarchive')) action = 'unarchive';
                else action = 'post';
            } else if (method === 'DELETE') {
                action = 'delete';
            }

            if (action === 'post' && !isErrorTestDone) {
                isErrorTestDone = true;
                return route.abort('failed'); 
            }

            apiStats[action] = true;

            setTimeout(async () => {
                try {
                    const hasLoading = await page.evaluate(() => {
                        const html = document.body.innerHTML.toLowerCase();
                        const hasTextMatch = html.includes('loading') || html.includes('tunggu') || html.includes('memuat') || html.includes('loader');
                        const hasVisualMatch = document.querySelector('[class*="load" i], [class*="spin" i], [id*="load" i], [id*="spin" i]') !== null;
                        
                        let hasCustomElementMatch = false;
                        const elements = document.querySelectorAll('*');
                        for (let el of elements) {
                            const tag = el.tagName.toLowerCase();
                            if (tag.includes('-') && (tag.includes('load') || tag.includes('spin'))) {
                                hasCustomElementMatch = true;
                                break;
                            }
                        }
                        
                        return hasTextMatch || hasVisualMatch || hasCustomElementMatch;
                    });
                    if (hasLoading) loadingStats[action] = true;
                } catch(e) {}
            }, 300);
            
            await new Promise(r => setTimeout(r, 1500));
            return route.continue();
        }
        route.continue();
    });

    let isErrorHandled = false;
    page.on('dialog', async dialog => {
        isErrorHandled = true;
        await dialog.accept();
    });

    const sweepModals = async () => {
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => {
                const buttons = [];
                function scan(node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.tagName === 'BUTTON' || (node.classList && (node.classList.contains('swal2-confirm') || node.classList.contains('swal2-close')))) {
                        buttons.push(node);
                    }
                    if (node.shadowRoot) Array.from(node.shadowRoot.childNodes).forEach(scan);
                    Array.from(node.childNodes).forEach(scan);
                }
                scan(document.body);

                buttons.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return;

                    const text = (el.textContent || '').toLowerCase().trim();
                    if (el.matches('.swal2-confirm, .swal2-close, .btn-close, [aria-label*="close" i]') || 
                        text.includes('ok') || 
                        (text.includes('ya') && !text.includes('tidak')) || 
                        text.includes('yes') || 
                        text.includes('tutup') || 
                        text.includes('hapus') || 
                        text.includes('delete') ||
                        text.includes('lanjut') ||
                        text.includes('yakin') ||
                        text.includes('setuju')) {
                        if (typeof el.click === 'function') el.click();
                    }
                });
            });
            await page.waitForTimeout(500);
        }
        await page.keyboard.press('Enter');
        
        await page.waitForFunction(() => {
            const swal = document.querySelector('.swal2-container');
            if (!swal) return true;
            const style = window.getComputedStyle(swal);
            return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        }, { timeout: 4000 }).catch(() => {});

        await page.waitForTimeout(1000); 
    };

    const forceClickHeuristic = async (keywords, excludeKeywords = []) => {
        return await page.evaluate(({ keywords, excludeKeywords }) => {
            let clicked = false;
            function scan(node) {
                if (!node || node.nodeType !== 1 || clicked) return;
                
                const style = window.getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
                const rect = node.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return;

                const tag = node.tagName.toLowerCase();
                const id = (node.id || '').toLowerCase();
                const cls = (typeof node.className === 'string' ? node.className : '').toLowerCase();
                const text = (node.textContent || '').toLowerCase().trim();
                const aria = (node.getAttribute('aria-label') || '').toLowerCase();
                const title = (node.getAttribute('title') || '').toLowerCase();

                if (['body', 'main', 'section', 'form', 'note-list', 'div', 'note-item'].includes(tag) && text.length > 50) {
                    // Ignore
                } else {
                    const stringToSearch = `${tag} ${id} ${cls} ${text} ${aria} ${title}`;
                    const isButtonLike = tag === 'button' || tag === 'a' || tag.includes('btn') || cls.includes('btn') || cls.includes('button') || id.includes('btn') || tag === 'svg' || cls.includes('icon') || cls.includes('trash');
                    
                    if (isButtonLike) {
                        const matchesKeyword = keywords.some(k => stringToSearch.includes(k));
                        const matchesExclude = excludeKeywords.some(e => stringToSearch.includes(e));

                        if (matchesKeyword && !matchesExclude) {
                            node.click();
                            clicked = true;
                            return;
                        }
                    }
                }
                if (node.shadowRoot) Array.from(node.shadowRoot.childNodes).forEach(scan);
                Array.from(node.children).forEach(scan);
            }
            scan(document.body);
            return clicked;
        }, { keywords, excludeKeywords });
    };

    try {
        console.log(`\n--- 🔍 DYNAMIC E2E & NETWORK AUDIT (Target: ${dynamicUrl}) ---`);
        await page.goto(dynamicUrl);
        await page.waitForLoadState('networkidle');

        console.log('> 🧹 PRE-FLIGHT: Wiping existing API data to ensure a clean testing canvas...');
        isPurging = true;
        await page.evaluate(async () => {
            try {
                let r = await fetch('https://notes-api.dicoding.dev/v2/notes');
                let d = await r.json();
                if (d.data) {
                    for (let n of d.data) await fetch(`https://notes-api.dicoding.dev/v2/notes/${n.id}`, { method: 'DELETE' });
                }
                r = await fetch('https://notes-api.dicoding.dev/v2/notes/archived');
                d = await r.json();
                if (d.data) {
                    for (let n of d.data) await fetch(`https://notes-api.dicoding.dev/v2/notes/${n.id}`, { method: 'DELETE' });
                }
            } catch(e) {}
        });
        isPurging = false;

        console.log('> ♻️ Reloading UI to reflect clean state...');
        await page.reload();

        console.log('> ⏳ Waiting for asynchronous renders and API delays to complete...');
        await page.waitForTimeout(4500); 
        await page.waitForLoadState('networkidle');

        await page.addStyleTag({ content: '#webpack-dev-server-client-overlay { display: none !important; pointer-events: none !important; z-index: -9999 !important; }' });
        await page.evaluate(() => {
            const killOverlay = () => {
                const overlay = document.getElementById('webpack-dev-server-client-overlay');
                if (overlay) overlay.remove();
            };
            killOverlay();
            const observer = new MutationObserver(killOverlay);
            observer.observe(document.body, { childList: true, subtree: true });
        });

        console.log('--- 🛡️ VERIFYING INHERITED SUBMISSION 1 CRITERIA ---');
        
        let titleInput = null, bodyInput = null, submitBtn = null;
        
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

        if (titleInput && bodyInput && submitBtn) {
            const titleTag = await titleInput.evaluate(el => el.tagName.toLowerCase());
            const bodyTag = await bodyInput.evaluate(el => el.tagName.toLowerCase());

            if (titleTag === 'input' && bodyTag === 'textarea') {
                report.mandatory["Criteria 1.1: Inherited Sub 1 Form Functionality"] = true;
            } else {
                report.mandatory["Criteria 1.1: Inherited Sub 1 Form Functionality"] = `FAIL: Tag tidak sesuai (<${titleTag}> & <${bodyTag}>)`;
            }
            
            console.log('> 🧪 Injecting Stage 1: Sabotaged payload to trigger error handling...');
            await titleInput.fill('Test Error Handling');
            await bodyInput.fill('Testing API failure response.');
            await submitBtn.click({ force: true }); 
            await sweepModals(); 
            
            if (isErrorHandled) {
                report.optional["Suggestion 2: Error Feedback Handled"] = true;
            } else {
                const hasErrorText = await page.evaluate(() => {
                    const html = document.body.innerHTML.toLowerCase();
                    return html.includes('gagal') || html.includes('error') || html.includes('periksa koneksi');
                });
                if (hasErrorText) report.optional["Suggestion 2: Error Feedback Handled"] = true;
            }

            console.log('> 🧪 Injecting Stage 2: Valid payload for ARCHIVE/UNARCHIVE operations...');
            await titleInput.fill(`Target Archive ${Date.now()}`);
            await bodyInput.fill('This note guarantees a target for the Archive Sniper.');
            await submitBtn.click({ force: true });
            await sweepModals();

            console.log('> 🧪 Injecting Stage 3: Valid payload for DELETE operation...');
            await titleInput.fill(`Target Delete ${Date.now()}`);
            await bodyInput.fill('This note guarantees a target for the Delete Sniper.');
            await submitBtn.click({ force: true });
            await sweepModals(); 
            
        } else {
            report.mandatory["Criteria 1.1: Inherited Sub 1 Form Functionality"] = "FAIL: Input/Textarea/Submit button tidak terdeteksi";
        }

        const componentTags = await page.evaluate(() => {
            const customTags = new Set();
            function scanNode(node) {
                if (node.tagName && node.tagName.includes('-')) customTags.add(`<${node.tagName.toLowerCase()}>`);
                if (node.shadowRoot) node.shadowRoot.childNodes.forEach(scanNode);
                node.childNodes.forEach(scanNode);
            }
            scanNode(document.body);
            return Array.from(customTags);
        });

        if (componentTags.length >= 3) {
            report.mandatory["Criteria 1.2: Inherited Sub 1 Web Components (Min 3)"] = `PASS: Found ${componentTags.join(', ')}`;
        } else {
            report.mandatory["Criteria 1.2: Inherited Sub 1 Web Components (Min 3)"] = `FAIL: Only found ${componentTags.length} (${componentTags.join(', ') || 'None'})`;
        }

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
            report.mandatory["Criteria 1.3: Inherited Sub 1 CSS Grid Layout"] = `PASS: Applied on ${gridInfo}`;
        } else {
            report.mandatory["Criteria 1.3: Inherited Sub 1 CSS Grid Layout"] = "FAIL: List is not using CSS Grid";
        }

        console.log('\n--- 🤖 AUTO-SNIPER: EXECUTING ARCHIVE & UNARCHIVE ---');
        
        console.log(`> 🎯 Auto-clicking ARCHIVE using Brute-Force Heuristic...`);
        const archiveClicked = await forceClickHeuristic(['archive', 'arsip'], ['unarchive', 'batal', 'kembali', 'tab']);
        if (!archiveClicked) console.log("> ⚠️ Warning: Could not locate Archive button via heuristics.");
        await sweepModals(); 

        console.log('> 🎯 Navigating to Archived Tab...');
        await forceClickHeuristic(['arsip', 'archive', 'tab-archive'], ['unarchive', 'batal', 'kembali', 'btn', 'button', 'trash']);
        await page.waitForTimeout(2000);

        console.log(`> 🎯 Auto-clicking UNARCHIVE using Brute-Force Heuristic...`);
        const unarchiveClicked = await forceClickHeuristic(['unarchive', 'batal arsip', 'kembali', 'pindah', 'inbox'], ['tab']);
        if (!unarchiveClicked) console.log("> ⚠️ Warning: Could not locate Unarchive button via heuristics.");
        await sweepModals();

        console.log('\n--- 🤖 AUTO-SNIPER: EXECUTING DELETE ---');
        
        console.log('> 🎯 Navigating back to Active Tab...');
        await forceClickHeuristic(['aktif', 'active', 'home'], ['tab-archive', 'arsip', 'archive']);
        await page.waitForTimeout(2000);

        console.log(`> 🎯 Auto-clicking DELETE using Brute-Force Heuristic...`);
        const deleteClicked = await forceClickHeuristic(['delete', 'hapus', 'trash'], ['tab']);
        if (!deleteClicked) console.log("> ⚠️ Warning: Could not locate Delete button via heuristics.");
        
        console.log(`> 🧹 Sweeping for DELETE Confirmation Modal...`);
        await sweepModals(); 

        const missingMethods = [];
        if (!apiStats.get) missingMethods.push('GET');
        if (!apiStats.post) missingMethods.push('POST');
        if (!apiStats.delete) missingMethods.push('DELETE');

        if (missingMethods.length === 0) {
            report.mandatory["Criteria 2: REST API Integrated (GET, POST, DELETE)"] = true;
        } else {
            report.mandatory["Criteria 2: REST API Integrated (GET, POST, DELETE)"] = `FAIL: Missing ${missingMethods.join(', ')}`;
        }

        const missingLoading = [];
        if (apiStats.get && !loadingStats.get) missingLoading.push('GET');
        if (apiStats.post && !loadingStats.post) missingLoading.push('POST');
        if (apiStats.delete && !loadingStats.delete) missingLoading.push('DELETE');
        if (apiStats.archive && !loadingStats.archive) missingLoading.push('ARCHIVE');
        if (apiStats.unarchive && !loadingStats.unarchive) missingLoading.push('UNARCHIVE');

        if (missingLoading.length === 0 && (apiStats.get || apiStats.post || apiStats.delete)) {
            report.mandatory["Criteria 5: Loading Indicator Rendered"] = true;
        } else if (missingLoading.length > 0) {
            report.mandatory["Criteria 5: Loading Indicator Rendered"] = `FAIL: No loading shown on ${missingLoading.join(', ')}`;
        } else {
            report.mandatory["Criteria 5: Loading Indicator Rendered"] = "FAIL: No API requests made to test loading";
        }

        if (apiStats.archive && apiStats.unarchive) {
            report.optional["Suggestion 1: Archive & Unarchive Implementation"] = true;
        } else if (apiStats.archive && !apiStats.unarchive) {
            console.log("⚠️ Partial success: Archive worked, but Unarchive was not detected.");
        }

        printSummaryReport(report);

        if (missingMethods.length > 0) {
            process.exitCode = 1; 
        }

    } catch (e) {
        console.error(`\n❌ [FATAL] E2E Crash: ${e.message}`);
        process.exitCode = 1; 
    } finally {
        await browser.close();
        try { process.kill(-serverProcess.pid); } catch (killError) {}
        console.log('\n🛑 [SYSTEM] 100% Automated Pipeline Completed. Environment terminated.');
    }
}

module.exports = { runSub2Tests };

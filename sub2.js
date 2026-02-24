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
            "Criteria 1.3: Inherited Sub 1 CSS Grid / Flexbox": false,
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
    runCommand('npm install', targetDir);
    
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
    let isErrorTestDone = false; 

    await page.route('**/*', async route => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('notes-api.dicoding.dev/v2/notes')) {
            if (method === 'GET' && !apiStats.get) {
                apiStats.get = true;
                setTimeout(async () => {
                    const hasLoading = await page.evaluate(() => {
                        const html = document.body.innerHTML.toLowerCase();
                        return html.includes('loading') || html.includes('tunggu') || document.querySelector('loading-indicator') !== null;
                    });
                    if (hasLoading) report.mandatory["Criteria 5: Loading Indicator Rendered"] = true;
                }, 500);
                
                await new Promise(r => setTimeout(r, 2000));
                return route.continue();
            }

            if (method === 'POST' && !url.includes('archive') && !url.includes('unarchive')) {
                if (!isErrorTestDone) {
                    isErrorTestDone = true;
                    return route.abort('failed'); 
                } else {
                    apiStats.post = true;
                    return route.continue();
                }
            }

            if (method === 'DELETE') apiStats.delete = true;
            if (method === 'POST' && url.includes('archive') && !url.includes('unarchive')) apiStats.archive = true;
            if (method === 'POST' && url.includes('unarchive')) apiStats.unarchive = true;

            return route.continue();
        }
        route.continue();
    });

    let isErrorHandled = false;
    page.on('dialog', async dialog => {
        isErrorHandled = true;
        await dialog.accept();
    });

    try {
        console.log(`\n--- 🔍 DYNAMIC E2E & NETWORK AUDIT (Target: ${dynamicUrl}) ---`);
        await page.goto(dynamicUrl);
        await page.waitForLoadState('networkidle');

        console.log('--- 🛡️ VERIFYING INHERITED SUBMISSION 1 CRITERIA ---');
        
        const titleInput = page.locator('input[type="text"], input[name="title"], #title, [placeholder*="judul" i]').first();
        const bodyInput = page.locator('textarea, [name="body"], #body, [placeholder*="isi" i]').first();
        const submitBtn = page.locator('button[type="submit"], form button').first();

        if (await titleInput.isVisible() && await bodyInput.isVisible() && await submitBtn.isVisible()) {
            report.mandatory["Criteria 1.1: Inherited Sub 1 Form Functionality"] = true;
            
            console.log('> 🧪 Injecting Stage 1: Sabotaged payload to trigger error handling...');
            await titleInput.fill('Test Error Handling');
            await bodyInput.fill('Testing API failure response.');
            await submitBtn.click();
            await page.waitForTimeout(1000); 
            
            if (isErrorHandled) {
                report.optional["Suggestion 2: Error Feedback Handled"] = true;
            } else {
                const hasErrorText = await page.evaluate(() => {
                    const html = document.body.innerHTML.toLowerCase();
                    return html.includes('gagal') || html.includes('error') || html.includes('periksa koneksi');
                });
                if (hasErrorText) report.optional["Suggestion 2: Error Feedback Handled"] = true;
            }

            await page.evaluate(() => {
                const buttons = document.querySelectorAll('button, .swal2-confirm, .swal2-close, .btn-close');
                buttons.forEach(el => {
                    const text = (el.textContent || '').toLowerCase().trim();
                    if (el.matches('.swal2-confirm, .swal2-close, .btn-close, [aria-label*="close" i]') || text === 'ok' || text === 'ya' || text === 'tutup') {
                        if (typeof el.click === 'function') el.click();
                    }
                });
            });
            await page.waitForTimeout(1000); 

            console.log('> 🧪 Injecting Stage 2: Valid payload for ARCHIVE/UNARCHIVE operations...');
            await titleInput.fill(`Target Archive ${Date.now()}`);
            await bodyInput.fill('This note guarantees a target for the Archive Sniper.');
            await submitBtn.click();
            await page.waitForTimeout(1500);

            await page.evaluate(() => {
                const buttons = document.querySelectorAll('button, .swal2-confirm');
                buttons.forEach(el => {
                    const text = (el.textContent || '').toLowerCase().trim();
                    if (el.matches('.swal2-confirm') || text === 'ok' || text === 'ya') {
                        if (typeof el.click === 'function') el.click();
                    }
                });
            });
            await page.waitForTimeout(500);

            console.log('> 🧪 Injecting Stage 3: Valid payload for DELETE operation...');
            await titleInput.fill(`Target Delete ${Date.now()}`);
            await bodyInput.fill('This note guarantees a target for the Delete Sniper.');
            await submitBtn.click();
            await page.waitForTimeout(1500);
        }

        const componentCount = await page.evaluate(() => {
            const customTags = new Set();
            function scanNode(node) {
                if (node.tagName && node.tagName.includes('-')) customTags.add(node.tagName.toLowerCase());
                if (node.shadowRoot) node.shadowRoot.childNodes.forEach(scanNode);
                node.childNodes.forEach(scanNode);
            }
            scanNode(document.body);
            return customTags.size;
        });
        if (componentCount >= 3) report.mandatory["Criteria 1.2: Inherited Sub 1 Web Components (Min 3)"] = true;

        const hasGrid = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
                if (window.getComputedStyle(el).display === 'grid' || window.getComputedStyle(el).display === 'flex') return true;
            }
            return false;
        });
        if (hasGrid) report.mandatory["Criteria 1.3: Inherited Sub 1 CSS Grid / Flexbox"] = true;

        console.log('\n--- 🤖 AUTO-SNIPER: EXECUTING ARCHIVE & UNARCHIVE ---');
        
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, .swal2-confirm, .swal2-close, .btn-close');
            buttons.forEach(el => {
                const text = (el.textContent || '').toLowerCase().trim();
                if (el.matches('.swal2-confirm, .swal2-close, .btn-close, [aria-label*="close" i]') || text === 'ok' || text === 'ya' || text === 'tutup') {
                    if (typeof el.click === 'function') el.click();
                }
            });
        });
        await page.waitForTimeout(1000); 

        const archiveSelectors = ['button:has-text("Arsip")', 'button:has-text("Archive")', 'button[class*="archive" i]', 'button[id*="archive" i]', 'button[aria-label*="archive" i]', 'button[aria-label*="arsip" i]', 'button:has(.lucide-archive)', 'button:has(.fa-archive)', '.archive-btn'];
        for (const sel of archiveSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible()) { 
                console.log(`> 🎯 Auto-clicking ARCHIVE using heuristic: ${sel}`);
                await btn.click({ force: true }); 
                break; 
            }
        }
        await page.waitForTimeout(1500);

        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, .swal2-confirm');
            buttons.forEach(el => {
                const text = (el.textContent || '').toLowerCase().trim();
                if (el.matches('.swal2-confirm') || text === 'ok' || text === 'ya') {
                    if (typeof el.click === 'function') el.click();
                }
            });
        });
        await page.waitForTimeout(1000);

        const unarchiveSelectors = ['button:has-text("Batal Arsip")', 'button:has-text("Unarchive")', 'button[class*="unarchive" i]', 'button[id*="unarchive" i]', 'button[aria-label*="unarchive" i]', 'button:has(.lucide-inbox)', '.unarchive-btn'];
        let clickedUnarchive = false;

        for (const sel of unarchiveSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible()) { 
                console.log(`> 🎯 Auto-clicking UNARCHIVE using heuristic: ${sel}`);
                await btn.click({ force: true }); 
                clickedUnarchive = true;
                break; 
            }
        }

        if (!clickedUnarchive) {
            console.log('> ⚠️ Unarchive button hidden. Attempting to navigate to Archived Tab...');
            const tabSelectors = ['button:has-text("Arsip")', 'a:has-text("Arsip")', 'button:has-text("Archive")', 'a:has-text("Archive")', '.tab-archive'];
            for (const tab of tabSelectors) {
                const tabBtn = page.locator(tab).first();
                if (await tabBtn.isVisible()) {
                    await tabBtn.click({ force: true });
                    await page.waitForTimeout(1000);
                    break;
                }
            }
            for (const sel of unarchiveSelectors) {
                const btn = page.locator(sel).first();
                if (await btn.isVisible()) { 
                    console.log(`> 🎯 Auto-clicking UNARCHIVE after tab switch: ${sel}`);
                    await btn.click({ force: true }); 
                    clickedUnarchive = true;
                    break; 
                }
            }
        }
        await page.waitForTimeout(1500);

        console.log('\n--- 🤖 AUTO-SNIPER: EXECUTING DELETE ---');
        const homeTabSelectors = ['button:has-text("Aktif")', 'a:has-text("Aktif")', 'button:has-text("Active")', 'a:has-text("Active")', 'button:has-text("Home")', 'a:has-text("Home")'];
        for (const tab of homeTabSelectors) {
            const tabBtn = page.locator(tab).first();
            if (await tabBtn.isVisible()) {
                await tabBtn.click({ force: true });
                await page.waitForTimeout(1000);
                break;
            }
        }

        const deleteSelectors = ['button:has-text("Hapus")', 'button:has-text("Delete")', 'button[class*="delete" i]', 'button[id*="delete" i]', 'button[aria-label*="delete" i]', 'button[aria-label*="hapus" i]', 'button:has(.lucide-trash)', 'button:has(.fa-trash)', '.delete-btn'];
        for (const sel of deleteSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible()) { 
                console.log(`> 🎯 Auto-clicking DELETE using heuristic: ${sel}`);
                await btn.click({ force: true }); 
                break; 
            }
        }
        await page.waitForTimeout(1000); 

        console.log(`> 🧹 Sweeping for DELETE Confirmation Modal...`);
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button, .swal2-confirm');
            buttons.forEach(el => {
                const text = (el.textContent || '').toLowerCase().trim();
                if (el.matches('.swal2-confirm') || text === 'ok' || text === 'ya' || text === 'yes' || text === 'hapus' || text === 'delete') {
                    if (typeof el.click === 'function') el.click();
                }
            });
        });
        await page.waitForTimeout(1500); 

        if (apiStats.get && apiStats.post && apiStats.delete) {
            report.mandatory["Criteria 2: REST API Integrated (GET, POST, DELETE)"] = true;
        }
        if (apiStats.archive && apiStats.unarchive) {
            report.optional["Suggestion 1: Archive & Unarchive Implementation"] = true;
        } else if (apiStats.archive && !apiStats.unarchive) {
            console.log("⚠️ Partial success: Archive worked, but Unarchive was not detected.");
        }

        printSummaryReport(report);

        if (!report.mandatory["Criteria 2: REST API Integrated (GET, POST, DELETE)"]) {
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

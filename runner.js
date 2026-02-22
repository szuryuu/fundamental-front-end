// runner.js
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const subType = process.argv[2];
const targetDir = process.argv[3];

if (!subType || !targetDir) {
    console.error('❌ [ERROR] Insufficient arguments provided to runner.js');
    process.exit(1);
}

// Helper function to execute shell commands synchronously
function runCommand(command, cwd) {
    console.log(`> Executing: ${command}`);
    try {
        execSync(command, { cwd, stdio: 'ignore' });
        return true;
    } catch (error) {
        console.error(`❌ [ERROR] Execution failed for command: ${command}`);
        return false;
    }
}

// SOURCE OF TRUTH: The exact 15 dummy notes required by Dicoding
// We use a substring of the body to prevent flaky tests caused by HTML formatting (\n, spaces)
const REQUIRED_NOTES = [
    { title: 'Welcome to Notes, Dimas!', body: 'Welcome to Notes! This is your first note.' },
    { title: 'Meeting Agenda', body: 'Discuss project updates and assign tasks' },
    { title: 'Shopping List', body: 'Milk, eggs, bread, fruits' },
    { title: 'Personal Goals', body: 'Read two books per month' },
    { title: 'Recipe: Spaghetti Bolognese', body: 'Ingredients: ground beef' },
    { title: 'Workout Routine', body: 'Monday: Cardio' },
    { title: 'Book Recommendations', body: '1. \'The Alchemist\'' },
    { title: 'Daily Reflections', body: 'Write down three positive things' },
    { title: 'Travel Bucket List', body: '1. Paris, France' },
    { title: 'Coding Projects', body: '1. Build a personal website' },
    { title: 'Project Deadline', body: 'Complete project tasks by the deadline' },
    { title: 'Health Checkup', body: 'Schedule a routine health checkup' },
    { title: 'Financial Goals', body: '1. Create a monthly budget' },
    { title: 'Holiday Plans', body: 'Research and plan for the upcoming holiday' },
    { title: 'Language Learning', body: 'Practice Spanish vocabulary' }
];

async function runSub1Tests() {
    console.log(`\n======================================================`);
    console.log(`🚀 INITIATING E2E PIPELINE: SUBMISSION 1 (VANILLA JS)`);
    console.log(`======================================================\n`);
    
    // Provision local server environment
    runCommand('npm init -y && npm install live-server', targetDir);
    const serverProcess = spawn('npx', ['live-server', '--port=8080', '--no-browser'], { cwd: targetDir });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const browser = await chromium.launch({ headless: false }); 
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('http://localhost:8080');
        await page.waitForLoadState('networkidle');

        console.log('--- 🔍 MAIN CRITERIA AUDIT ---');

        // CRITERIA 1: Render 15 Dummy Notes (Title & Body) via Shadow DOM Piercing
        let foundCount = 0;
        let missingNotes = [];

        for (const note of REQUIRED_NOTES) {
            const titleVisible = await page.getByText(note.title, { exact: false }).first().isVisible();
            const bodyVisible = await page.getByText(note.body, { exact: false }).first().isVisible();

            if (titleVisible && bodyVisible) foundCount++;
            else missingNotes.push(note.title);
        }

        if (foundCount === 15) {
            console.log(`✅ [PASS] Criteria 1: All 15 required dummy notes (Title & Body) rendered successfully.`);
        } else {
            console.log(`❌ [FAIL] Criteria 1: Found only ${foundCount}/15 notes complete with titles and bodies.`);
            console.log(`   Missing/Incomplete: ${missingNotes.join(', ')}`);
            console.log(`   > VERDICT: REJECT.`);
        }

        // CRITERIA 2: Add Note Form Functionality
        const titleInput = page.locator('input[type="text"], input[name="title"], #title, [placeholder*="judul" i], [placeholder*="title" i]').first();
        const bodyInput = page.locator('textarea, [name="body"], #body, [placeholder*="isi" i], [placeholder*="note" i]').first();
        const submitBtn = page.locator('button[type="submit"], form button').first();

        if (await titleInput.isVisible() && await bodyInput.isVisible() && await submitBtn.isVisible()) {
            const testTitle = `DevOps Auto Test ${Date.now()}`;
            await titleInput.fill(testTitle);
            await bodyInput.fill('This payload was injected by the CI/CD pipeline.');
            await submitBtn.click();
            
            const isNewNoteVisible = await page.getByText(testTitle).isVisible();
            if (isNewNoteVisible) console.log(`✅ [PASS] Criteria 2: Form submitted and payload successfully rendered to the DOM.`);
            else console.log(`❌ [FAIL] Criteria 2: Form submitted but new payload did not appear on screen.`);
        } else {
            console.log(`❌ [FAIL] Criteria 2: Standard <input> or <textarea> elements for the form could not be located.`);
        }

        // CRITERIA 4 & SUGGESTION 3: Recursive Web Components & Custom Attributes Audit
        const customComponentAudit = await page.evaluate(() => {
            const customTags = new Set();
            let hasCustomAttr = false;
            let foundAttributes = [];
            const standardAttrs = ['id', 'class', 'style', 'type', 'name', 'value', 'placeholder', 'required', 'minlength', 'maxlength'];

            function scanNode(node) {
                if (node.tagName && node.tagName.includes('-')) {
                    const tag = node.tagName.toLowerCase();
                    customTags.add(tag);
                    
                    Array.from(node.attributes).forEach(attr => {
                        if (!standardAttrs.includes(attr.name.toLowerCase())) {
                            hasCustomAttr = true;
                            foundAttributes.push(`${tag} -> ${attr.name}="${attr.value}"`);
                        }
                    });
                }
                if (node.shadowRoot) node.shadowRoot.childNodes.forEach(scanNode);
                node.childNodes.forEach(scanNode);
            }
            scanNode(document.body);
            return { tags: Array.from(customTags), hasCustomAttr, foundAttributes };
        });

        if (customComponentAudit.tags.length >= 3) {
            console.log(`✅ [PASS] Criteria 4: Found ${customComponentAudit.tags.length} Custom Elements: ${customComponentAudit.tags.join(', ')}`);
        } else {
            console.log(`❌ [FAIL] Criteria 4: Found only ${customComponentAudit.tags.length} Custom Elements (Minimum 3 required).`);
        }

        console.log('\n--- 💡 OPTIONAL SUGGESTIONS AUDIT ---');

        // CRITERIA 3: Rough CSS Grid Detection
        const hasGrid = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
                if (window.getComputedStyle(el).display === 'grid') return true;
            }
            return false;
        });
        if (hasGrid) console.log(`✅ [INFO] Criteria 3: 'display: grid' property detected in the DOM.`);
        else console.log(`❌ [WARNING] Criteria 3: CSS Grid not automatically detected.`);

        // SUGGESTION 2: Realtime Form Validation API Check
        if (await titleInput.isVisible()) {
            const hasHTML5Validation = await titleInput.evaluate(el => el.hasAttribute('required') || el.hasAttribute('minlength'));
            await titleInput.fill('');
            await titleInput.type('a'); // Trigger invalid state
            const isValid = await titleInput.evaluate(el => el.validity.valid);
            const validationMsg = await titleInput.evaluate(el => el.validationMessage);

            if (hasHTML5Validation || !isValid || validationMsg !== '') {
                console.log(`✅ [PASS] Suggestion 2: Realtime Validation state detected via internal Browser API.`);
            } else {
                console.log(`❌ [FAIL] Suggestion 2: No standard form validation detected by the engine.`);
            }
        }

        // SUGGESTION 3 Result
        if (customComponentAudit.hasCustomAttr) {
            console.log(`✅ [PASS] Suggestion 3: Custom Attributes detected:\n   -> ${customComponentAudit.foundAttributes.join('\n   -> ')}`);
        } else {
            console.log(`❌ [FAIL] Suggestion 3: No custom attributes found on Web Components.`);
        }

        // SUGGESTION 4: Viewport Manipulation (Mobile Overflow Check)
        const desktopSize = page.viewportSize();
        await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 dimensions
        await page.waitForTimeout(1000); 

        const isResponsive = await page.evaluate(() => {
            return document.documentElement.scrollWidth <= window.innerWidth;
        });

        if (isResponsive) console.log(`✅ [PASS] Suggestion 4: Layout is safe on Mobile viewport (No horizontal overflow).`);
        else console.log(`❌ [FAIL] Suggestion 4: Layout BROKEN on Mobile viewport (Horizontal overflow detected).`);
        
        if (desktopSize) await page.setViewportSize(desktopSize);

        console.log('\n👀 [MANUAL OVERRIDE] Browser closing in 15 seconds. Inspect Aesthetics (Suggestion 1) & Date Formatting visually...');
        await page.waitForTimeout(15000);

    } catch (e) {
        console.error(`\n❌ [FATAL] E2E Crash: ${e.message}`);
        process.exitCode = 1; // Signal failure to the Golang orchestrator
    } finally {
        await browser.close();
        try {
            process.kill(-serverProcess.pid);
        } catch (killError) {
            // Suppress error if the process is already dead
        }
        console.log('🛑 [SYSTEM] Environment terminated.');
    }
}

async function runSub2Tests() {
    console.log(`\n======================================================`);
    console.log(`🚀 INITIATING E2E PIPELINE: SUBMISSION 2 (REST API & WEBPACK)`);
    console.log(`======================================================\n`);
    
    console.log('--- 🔍 STATIC ENVIRONMENT ANALYSIS ---');
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        // Criteria 3: Webpack Check
        if (pkg.devDependencies && (pkg.devDependencies.webpack || pkg.devDependencies['webpack-dev-server'])) {
            console.log('✅ [PASS] Criteria 3: Webpack & dev-server dependencies detected.');
        } else {
            console.log('❌ [FAIL] Criteria 3: Webpack missing from devDependencies.');
        }

        // Suggestion 4: Prettier Check
        const hasPrettierDep = pkg.devDependencies && pkg.devDependencies.prettier;
        const hasPrettierRc = fs.existsSync(path.join(targetDir, '.prettierrc')) || fs.existsSync(path.join(targetDir, '.prettierrc.json'));
        if (hasPrettierDep && hasPrettierRc) console.log('✅ [PASS] Suggestion 4: Prettier configuration file located.');
        else console.log('❌ [FAIL] Suggestion 4: Prettier configuration missing or incomplete.');
    }

    // Criteria 4: Static Fetch Source Code Grep
    try {
        const grepCmd = `grep -r "fetch(" src/ || echo "NOT_FOUND"`;
        const fetchCheck = execSync(grepCmd, { cwd: targetDir, encoding: 'utf8' });
        if (!fetchCheck.includes("NOT_FOUND")) console.log('✅ [PASS] Criteria 4: "fetch(" keyword detected in source codebase.');
        else console.log('❌ [WARNING] Criteria 4: "fetch(" keyword missing. Verify manually if axios/XHR was used.');
    } catch (e) {}

    console.log('\n--- ⚙️ COMPILING PRODUCTION BUILD ---');
    runCommand('npm install', targetDir);
    
    // Criteria 3: Production Build Execution
    console.log('> Executing: npm run build');
    const buildResult = runCommand('npm run build', targetDir);
    if (!buildResult) {
        console.error('❌ [FATAL] Criteria 3: Production compilation failed. VERDICT: REJECT.');
        process.exit(1);
    }
    
    console.log('> Initializing Webpack Dev Server. Waiting 10 seconds for compilation...');
    const serverProcess = spawn('npm', ['run', 'start-dev'], { cwd: targetDir, detached: true });
    
    // Increased delay to 10 seconds to prevent ERR_CONNECTION_REFUSED on heavier builds
    await new Promise(resolve => setTimeout(resolve, 10000)); 

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let apiStats = { get: false, post: false, delete: false, archive: false };
    let isErrorHandled = false;

    // THE NETWORK SNIPER: Intercepting Dicoding API Traffic
    await page.route('**/*', async route => {
        const request = route.request();
        const url = request.url();
        const method = request.method();

        if (url.includes('notes-api.dicoding.dev/v2/notes')) {
            // Criteria 5: Loading Indicator Injection (Delay GET)
            if (method === 'GET' && !apiStats.get) {
                apiStats.get = true;
                setTimeout(async () => {
                    const hasLoading = await page.evaluate(() => {
                        const html = document.body.innerHTML.toLowerCase();
                        return html.includes('loading') || html.includes('tunggu') || document.querySelector('loading-indicator') !== null;
                    });
                    if (hasLoading) console.log('✅ [PASS] Criteria 5: Loading indicator rendered in DOM during network latency.');
                    else console.log('❌ [FAIL] Criteria 5: No loading indicator detected while API response was pending.');
                }, 500);
                
                await new Promise(r => setTimeout(r, 2000));
                return route.continue();
            }

            // Suggestion 2: Error Feedback Injection (Abort POST)
            if (method === 'POST' && !url.includes('archive') && !apiStats.post) {
                apiStats.post = true;
                console.log('⚠️ [TEST] Sabotaging POST request to trigger Error Feedback (Suggestion 2)...');
                return route.abort('failed'); 
            }

            if (method === 'DELETE') apiStats.delete = true;
            if (method === 'POST' && url.includes('archive')) apiStats.archive = true;

            return route.continue();
        }
        route.continue();
    });

    // Event Listener for Native Browser Alerts
    page.on('dialog', async dialog => {
        console.log(`✅ [PASS] Suggestion 2: Alert dialog intercepted: "${dialog.message()}"`);
        isErrorHandled = true;
        await dialog.accept();
    });

    try {
        console.log('\n--- 🔍 DYNAMIC E2E & NETWORK AUDIT ---');
        await page.goto('http://localhost:8080');
        await page.waitForLoadState('networkidle');

        // Trigger POST Error Trap
        const titleInput = page.locator('input[type="text"], input[name="title"], #title, [placeholder*="judul" i]').first();
        const bodyInput = page.locator('textarea, [name="body"], #body, [placeholder*="isi" i]').first();
        const submitBtn = page.locator('button[type="submit"], form button').first();

        if (await titleInput.isVisible()) {
            await titleInput.fill('Test Error Handling');
            await bodyInput.fill('Testing API failure response.');
            await submitBtn.click();
            await page.waitForTimeout(1000); 
            
            // Check DOM for error text if no alert popped up
            if (!isErrorHandled) {
                const hasErrorText = await page.evaluate(() => {
                    const html = document.body.innerHTML.toLowerCase();
                    return html.includes('gagal') || html.includes('error') || html.includes('periksa koneksi');
                });
                if (hasErrorText) console.log(`✅ [PASS] Suggestion 2: Error message rendered gracefully in DOM.`);
                else console.log(`❌ [FAIL] Suggestion 2: Application failed silently. No error feedback provided to the user.`);
            }
        }

        console.log('\n--- 🚦 NETWORK INTERCEPTION RESULTS ---');
        console.log(` GET Data (Criteria 2): ${apiStats.get ? '✅ PASS' : '❌ FAIL'}`);
        console.log(` POST Create (Criteria 2): ${apiStats.post ? '✅ PASS' : '❌ FAIL'}`);
        
        console.log('\n👀 [MANUAL OVERRIDE] ACTION REQUIRED IN BROWSER:');
        console.log('1. Click DELETE on a note to fire the DELETE API (Criteria 2).');
        console.log('2. Click ARCHIVE on a note to fire the POST /archive API (Suggestion 1).');
        console.log('3. Visually verify Animation smoothness (Suggestion 3).');
        
        let timeLeft = 25;
        while(timeLeft > 0) {
            process.stdout.write(`\rBrowser session expires in ${timeLeft}s... (DELETE Captured: ${apiStats.delete}, ARCHIVE Captured: ${apiStats.archive})`);
            await page.waitForTimeout(1000);
            timeLeft--;
        }
        console.log(''); 

        if (apiStats.delete) console.log('✅ [PASS] Criteria 2 (Delete): Valid DELETE API request intercepted.');
        else console.log('❌ [FAIL] Criteria 2 (Delete): No DELETE API request detected. User failed to implement or button was not clicked.');

        if (apiStats.archive) console.log('✅ [PASS] Suggestion 1 (Archive): Valid POST /archive API request intercepted.');
        else console.log('❌ [FAIL] Suggestion 1 (Archive): No Archive API request detected.');

    } catch (e) {
        console.error(`\n❌ [FATAL] E2E Crash: ${e.message}`);
        process.exitCode = 1; // Signal failure to the Golang orchestrator
    } finally {
        await browser.close();
        try {
            process.kill(-serverProcess.pid); 
        } catch (killError) {
            // Suppress error if the process is already dead
        }
        console.log('🛑 [SYSTEM] Environment terminated.');
    }
}

if (subType === 'sub1') runSub1Tests();
else if (subType === 'sub2') runSub2Tests();
else { console.error(`❌ [ERROR] Unrecognized pipeline: ${subType}`); process.exit(1); }

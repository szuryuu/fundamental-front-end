// utils.js
const { execSync } = require('child_process');

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

// Helper function to print the final aggregated report dynamically
function printSummaryReport(report) {
    console.log('\n======================================================');
    console.log('📊 FINAL AUTOMATED REVIEW SUMMARY');
    console.log('======================================================');
    
    const formatStatus = (status) => {
        if (status === true || (typeof status === 'string' && status.startsWith('PASS'))) return '✅ PASS';
        if (status === false || (typeof status === 'string' && status.startsWith('FAIL'))) return '❌ FAIL';
        if (typeof status === 'string' && status.startsWith('INFO')) return 'ℹ️ INFO';
        return '❌ FAIL';
    };

    const formatKey = (key, status) => {
        if (typeof status === 'string') {
            // Extract the context provided after the prefix (e.g., "PASS: <app-bar>")
            const match = status.match(/^(PASS|FAIL|INFO):\s*(.*)/);
            if (match && match[2]) {
                return `${key} (${match[2]})`;
            }
        }
        return key;
    };

    console.log('\n--- 🎯 MANDATORY CRITERIA ---');
    for (const [key, status] of Object.entries(report.mandatory)) {
        console.log(` ${formatStatus(status).padEnd(8)} | ${formatKey(key, status)}`);
    }
    
    console.log('\n--- 💡 OPTIONAL SUGGESTIONS ---');
    for (const [key, status] of Object.entries(report.optional)) {
        console.log(` ${formatStatus(status).padEnd(8)} | ${formatKey(key, status)}`);
    }
    
    console.log('\n⚠️  NOTE: Visual aesthetics, animation smoothness, and code plagiarism still require human verification.');
    console.log('======================================================\n');
}

// SOURCE OF TRUTH: The exact 15 dummy notes required by Dicoding
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

module.exports = {
    runCommand,
    printSummaryReport,
    REQUIRED_NOTES
};

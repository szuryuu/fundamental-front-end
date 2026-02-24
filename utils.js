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

// Helper function to print the final aggregated report
function printSummaryReport(report) {
    console.log('\n======================================================');
    console.log('📊 FINAL AUTOMATED REVIEW SUMMARY');
    console.log('======================================================');
    
    const formatStatus = (status) => {
        if (status === true) return '✅ PASS';
        if (status === false) return '❌ FAIL';
        if (typeof status === 'string' && status.startsWith('INFO')) return 'ℹ️ INFO';
        return '❌ FAIL';
    };

    console.log('\n--- 🎯 MANDATORY CRITERIA ---');
    for (const [key, status] of Object.entries(report.mandatory)) {
        let displayKey = key;
        if (typeof status === 'string' && status.startsWith('INFO: ')) {
            displayKey = `${key} (${status.replace('INFO: ', '')})`;
        }
        console.log(` ${formatStatus(status).padEnd(8)} | ${displayKey}`);
    }
    
    console.log('\n--- 💡 OPTIONAL SUGGESTIONS ---');
    for (const [key, status] of Object.entries(report.optional)) {
        let displayKey = key;
        if (typeof status === 'string' && status.startsWith('INFO: ')) {
            displayKey = `${key} (${status.replace('INFO: ', '')})`;
        }
        console.log(` ${formatStatus(status).padEnd(8)} | ${displayKey}`);
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

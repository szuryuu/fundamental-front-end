// runner.js
const { runSub1Tests } = require('./sub1');
const { runSub2Tests } = require('./sub2');

const subType = process.argv[2];
const targetDir = process.argv[3];

if (!subType || !targetDir) {
    console.error('❌ [ERROR] Insufficient arguments provided to runner.js');
    process.exit(1);
}

if (subType === 'sub1') {
    runSub1Tests(targetDir);
} else if (subType === 'sub2') {
    runSub2Tests(targetDir);
} else {
    console.error(`❌ [ERROR] Unrecognized pipeline: ${subType}`);
    process.exit(1);
}

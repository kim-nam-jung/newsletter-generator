const path = require('path');

const testPath = '/uploads/test.png';
const normalized = path.normalize(testPath);
const isAbsolute = path.isAbsolute(normalized);

console.log(`Original: ${testPath}`);
console.log(`Normalized: ${normalized}`);
console.log(`Is Absolute: ${isAbsolute}`);

const fixedPath = testPath.replace(/^[\/\\]/, '');
console.log(`Fixed: ${fixedPath}`);
console.log(`Fixed Absolute: ${path.isAbsolute(fixedPath)}`);

const assert = require('assert');
const { renderProgressBar, colorPct } = require('../src/quota');

console.log('Testing renderProgressBar...');
assert(renderProgressBar(100).includes('██████████'));
assert(renderProgressBar(0).includes('░░░░░░░░░░'));
assert(renderProgressBar(50).includes('█████░░░░░'));

console.log('Testing colorPct...');
assert(colorPct(100).includes('100.0%'));
assert(colorPct(14.0).includes('14.0%'));
assert(colorPct(null).includes('N/A'));

console.log('All quota utility tests passed!');

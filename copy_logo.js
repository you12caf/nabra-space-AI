const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'logo.png');
const dest = path.join(__dirname, 'artifacts', 'nabra-space', 'public', 'logo.png');

fs.copyFileSync(src, dest);
console.log('Logo copied successfully!');

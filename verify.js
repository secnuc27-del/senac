const fs = require('fs');
const path = require('path');

const diaHtml = fs.readFileSync(path.join(__dirname, 'dia.html'), 'utf8');

// Find all occurrences of P+'filename.ext'
const matches = [];
const regex = /P\+'([^']+)'/g;
let match;
while ((match = regex.exec(diaHtml)) !== null) {
  matches.push(match[1]);
}

console.log("Checking referenced photos in dia.html:");
const dir = path.join(__dirname, 'fotos');
let missingCount = 0;

// Deduplicate matches
const uniqueMatches = [...new Set(matches)];

uniqueMatches.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Missing file: "${file}"`);
    missingCount++;
  } else {
    console.log(`  ✓ Found file: "${file}"`);
  }
});

if (missingCount === 0) {
  console.log("\n🎉 All referenced photos exist successfully!");
} else {
  console.log(`\n⚠️ Missing ${missingCount} photos!`);
}

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'fotos');
const files = fs.readdirSync(dir);

function cleanName(name) {
  let ext = path.extname(name);
  let base = path.basename(name, ext);
  
  // Decompose accented characters and strip the accent markers
  let cleaned = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Custom manual replacements for specific Brazilian/Portuguese characters not fully handled by standard normalization
  cleaned = cleaned.toLowerCase();
  cleaned = cleaned.replace(/ç/g, 'c');
  
  // Replace all non-alphanumeric character sequences with a single hyphen
  cleaned = cleaned.replace(/[^a-z0-9]+/g, '-');
  
  // Remove leading and trailing hyphens
  cleaned = cleaned.replace(/^-+|-+$/g, '');
  
  return cleaned + ext.toLowerCase();
}

console.log("Starting photo renaming in:", dir);
let renameCount = 0;

files.forEach(file => {
  const oldPath = path.join(dir, file);
  if (fs.statSync(oldPath).isDirectory()) return;
  
  const newName = cleanName(file);
  const newPath = path.join(dir, newName);
  
  if (file !== newName) {
    console.log(`Renaming: "${file}" -> "${newName}"`);
    fs.renameSync(oldPath, newPath);
    renameCount++;
  } else {
    console.log(`Already standardized: "${file}"`);
  }
});

console.log(`Done! Renamed ${renameCount} files.`);

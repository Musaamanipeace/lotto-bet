const fs = require('fs');
const path = require('path');

const root = '/home/mamani/Documents/lotto-bet';
const md = fs.readFileSync(path.join(root, 'codebase.md'), 'utf8');

// Parse the markdown to extract file contents
// Format: ### `filepath` followed by ```lang ... ```
const lines = md.split('\n');
const files = [];
let currentFile = null;
let currentLang = null;
let contentStart = false;
let contentLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Match file header: ### `path`
  const headerMatch = line.match(/^### `([^`]+)`$/);
  if (headerMatch) {
    // Save previous file if any
    if (currentFile && contentStart) {
      files.push({ file: currentFile, lang: currentLang, content: contentLines.join('\n') });
    }
    currentFile = headerMatch[1];
    currentLang = null;
    contentStart = false;
    contentLines = [];
    continue;
  }
  
  // Match code fence opening: ```lang or ```
  if (contentStart === false && line.startsWith('```')) {
    currentLang = line.slice(3);
    contentStart = true;
    contentLines = [];
    continue;
  }
  
  // Match code fence closing
  if (contentStart && line.startsWith('```')) {
    files.push({ file: currentFile, lang: currentLang, content: contentLines.join('\n') });
    currentFile = null;
    currentLang = null;
    contentStart = false;
    contentLines = [];
    continue;
  }
  
  if (contentStart) {
    contentLines.push(line);
  }
}

// Save the last file
if (currentFile && contentStart) {
  files.push({ file: currentFile, lang: currentLang, content: contentLines.join('\n') });
}

console.log(`Extracted ${files.length} files from codebase.md`);

// Write each file
let written = 0;
let skipped = 0;
for (const { file, lang, content } of files) {
  if (!file || file === 'codebase.md' || file === 'lotto-bet.tar.gz' || file.endsWith('.tsbuildinfo') || file === 'package-lock.json') {
    skipped++;
    continue;
  }
  
  const fullPath = path.join(root, file);
  const dir = path.dirname(fullPath);
  
  // Create directory if needed
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Check if file already exists and has same content
  let needsWrite = true;
  if (fs.existsSync(fullPath)) {
    const existing = fs.readFileSync(fullPath, 'utf8');
    if (existing === content) {
      needsWrite = false;
    }
  }
  
  if (needsWrite) {
    fs.writeFileSync(fullPath, content, 'utf8');
    written++;
    console.log(`  Written: ${file} (${content.length} chars)`);
  } else {
    console.log(`  Unchanged: ${file}`);
  }
}

console.log(`\nWritten: ${written}, Skipped: ${skipped}`);

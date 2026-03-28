/**
 * Template: Code Comments Quality
 *
 * WHAT THIS TESTS:
 * Validates that functions and files have adequate JSDoc-style documentation.
 * Uses test.each to generate one test per function per check — a small number
 * of check types fans out across your entire codebase automatically.
 *
 * WHEN TO USE:
 * - Any project where documentation quality matters for maintainability
 * - Open-source projects where contributors need to understand the code
 * - Codebases with more than a few files where manual review doesn't scale
 * - Google Apps Script projects, Node.js backends, or any JavaScript codebase
 *
 * WHAT TO LOOK FOR:
 * - Functions missing JSDoc blocks entirely
 * - @param tags that don't match actual function parameters
 * - Missing @returns tags on functions that return values
 * - Inconsistent section separator formatting
 * - Unresolved TODO/FIXME/HACK markers left in production code
 *
 * HOW IT WORKS:
 * This is a "wide" test — it defines ~7 check types but generates hundreds or
 * thousands of individual tests because it creates one test per function per check
 * across every source file. Adding a new file or function automatically increases
 * the test count without writing new test code.
 */

const fs = require('fs');
const path = require('path');

// ADAPT: Change these to your source directories
const SOURCE_DIRS = [
  path.resolve(__dirname, '../src'),
  // path.resolve(__dirname, '../lib'),
];

// ADAPT: Change this to match your source file extensions
const FILE_EXTENSION = '.js';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Read all source files from configured directories.
 * @param {string} ext - File extension to match
 * @returns {Array<{name: string, content: string}>}
 */
function readSourceFiles(ext) {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .forEach(f => {
        files.push({ name: f, content: fs.readFileSync(path.join(dir, f), 'utf-8') });
      });
  }
  return files;
}

/**
 * Extract all function declarations from source code.
 * Returns name, params, whether it has a return statement,
 * and the JSDoc block immediately preceding it.
 * @param {string} content - File content
 * @returns {Array<{name: string, params: string[], hasReturn: boolean, precedingBlock: string, line: number}>}
 */
function extractFunctions(content) {
  const lines = content.split('\n');
  const functions = [];
  // ADAPT: Adjust regex for your language's function syntax
  // This handles: function name(params) {
  // For arrow functions or class methods, modify the regex
  const funcRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(funcRegex);
    if (!match) continue;

    const name = match[1];
    const params = match[2].split(',').map(p => p.trim()).filter(Boolean);

    // Collect the JSDoc block immediately above this function
    let precedingLines = [];
    for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
      const trimmed = lines[j].trim();
      if (trimmed === '' && precedingLines.length > 0) break;
      if (trimmed === '') continue;
      if (trimmed === '}' && precedingLines.length > 0) break;
      precedingLines.unshift(lines[j]);
      if (trimmed.startsWith('/**')) break;
    }
    const precedingBlock = precedingLines.join('\n');

    // Check if function body contains a return statement with a value
    let braceDepth = 0;
    let hasReturn = false;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      if (/\breturn\s+[^;]/.test(lines[j])) hasReturn = true;
      if (braceDepth === 0) break;
    }

    functions.push({ name, params, hasReturn, precedingBlock, line: i + 1 });
  }
  return functions;
}

/** Check if a text block is a JSDoc comment. */
function isJSDoc(block) {
  return /\/\*\*[\s\S]*?\*\//.test(block);
}

/** Extract @param names from a JSDoc block (handles [optional] and sub.property syntax). */
function extractJSDocParams(block) {
  const matches = [...block.matchAll(/@param\s+(?:\{[^}]*\}\s+)?\[?(\w+(?:\.\w+)?)(?:=[^\]]*)?\]?/g)];
  return matches
    .map(m => m[1])
    .filter(name => !name.includes('.'));
}

/** Check if a JSDoc block has an @returns or @return tag. */
function hasReturnsTag(block) {
  return /@returns?\s/.test(block);
}

// ============================================================================
// FILE DATA
// ============================================================================

const sourceFiles = readSourceFiles(FILE_EXTENSION);

// Skip all tests if no source files found (template not yet adapted)
const describeIfFiles = sourceFiles.length > 0 ? describe : describe.skip;

// ============================================================================
// TEST 1 — Files have a file-level JSDoc header
// ============================================================================

describeIfFiles('File-level JSDoc headers', () => {
  test.each(sourceFiles.map(f => [f.name, f.content]))(
    '%s has a file-level JSDoc header',
    (name, content) => {
      const firstBlock = content.substring(0, content.indexOf('*/') + 2);
      expect(firstBlock).toMatch(/^\/\*\*/);
    }
  );
});

// ============================================================================
// TEST 2 — Functions have JSDoc blocks
// ============================================================================

describeIfFiles('Function JSDoc coverage', () => {
  const allFunctions = [];
  for (const file of sourceFiles) {
    for (const fn of extractFunctions(file.content)) {
      allFunctions.push({ file: file.name, ...fn });
    }
  }

  if (allFunctions.length > 0) {
    test.each(allFunctions.map(f => [`${f.file}:${f.line} ${f.name}()`, f]))(
      '%s has a JSDoc comment',
      (label, fn) => {
        expect(isJSDoc(fn.precedingBlock)).toBe(true);
      }
    );
  }
});

// ============================================================================
// TEST 3 — JSDoc @param tags match actual parameters
// ============================================================================

describeIfFiles('JSDoc @param accuracy', () => {
  const documented = [];
  for (const file of sourceFiles) {
    for (const fn of extractFunctions(file.content)) {
      if (isJSDoc(fn.precedingBlock) && fn.params.length > 0) {
        documented.push({ file: file.name, ...fn });
      }
    }
  }

  if (documented.length > 0) {
    test.each(documented.map(f => [`${f.file}:${f.line} ${f.name}()`, f]))(
      '%s @param tags match parameters',
      (label, fn) => {
        const docParams = extractJSDocParams(fn.precedingBlock);
        expect(docParams).toEqual(fn.params);
      }
    );
  }
});

// ============================================================================
// TEST 4 — JSDoc @returns tag when function returns a value
// ============================================================================

describeIfFiles('JSDoc @returns completeness', () => {
  const returning = [];
  for (const file of sourceFiles) {
    for (const fn of extractFunctions(file.content)) {
      if (isJSDoc(fn.precedingBlock) && fn.hasReturn) {
        returning.push({ file: file.name, ...fn });
      }
    }
  }

  if (returning.length > 0) {
    test.each(returning.map(f => [`${f.file}:${f.line} ${f.name}()`, f]))(
      '%s has @returns tag',
      (label, fn) => {
        expect(hasReturnsTag(fn.precedingBlock)).toBe(true);
      }
    );
  }
});

// ============================================================================
// TEST 5 — No unresolved TODO/FIXME/HACK markers
// ============================================================================

describeIfFiles('No unresolved code markers', () => {
  test.each(sourceFiles.map(f => [f.name, f.content]))(
    '%s has no unresolved TODO/FIXME/HACK comments',
    (name, content) => {
      const lines = content.split('\n');
      const markers = [];

      lines.forEach((line, idx) => {
        // Strip quoted strings to avoid false positives from regex patterns
        const stripped = line.replace(/["'`].*?["'`]/g, '').replace(/\/.*?\//g, '');
        if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(stripped) && /\/\/|\/\*|\*/.test(line)) {
          markers.push(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });

      if (markers.length > 0) {
        throw new Error(`Found ${markers.length} unresolved marker(s) in ${name}:\n${markers.join('\n')}`);
      }
    }
  );
});

/**
 * Template: Test Suite Health (Meta-Test)
 *
 * WHAT THIS TESTS:
 * Validates the test suite itself — catches coverage gaps, skipped tests,
 * duplicate names, empty blocks, and structural inconsistencies. This is
 * a "test that tests the tests."
 *
 * WHEN TO USE:
 * - Any project with more than 3-4 test files
 * - Teams where test quality can drift over time
 * - Projects where you want to enforce that new source files get test coverage
 * - CI pipelines where you want to catch accidentally skipped or broken tests
 *
 * WHAT TO LOOK FOR:
 * - Source files with no corresponding test coverage
 * - Accidentally skipped tests (xdescribe, test.skip, .only left in)
 * - Duplicate test descriptions that mask failures
 * - Empty describe blocks that give false confidence
 * - Tiny test files that may be stubs or incomplete
 *
 * HOW IT WORKS:
 * Reads all test files and source files, then cross-references them. Uses
 * test.each to generate one check per source file for coverage verification.
 * Recognizes both explicit filename references and dynamic directory scanning
 * (readdirSync) as valid coverage.
 */

const fs = require('fs');
const path = require('path');

// ADAPT: Change these paths to match your project structure
const ROOT_DIR = path.resolve(__dirname, '..');
const TESTS_DIR = path.resolve(__dirname);
// ADAPT: Add your source directories
const SOURCE_DIRS = [
  { dir: path.resolve(ROOT_DIR, 'src'), ext: '.js', label: 'src' },
  // { dir: path.resolve(ROOT_DIR, 'lib'), ext: '.js', label: 'lib' },
];

// ============================================================================
// HELPERS
// ============================================================================

/** Read all test files (excluding this meta-test). */
function readTestFiles() {
  return fs.readdirSync(TESTS_DIR)
    .filter(f => f.endsWith('.test.js') && f !== 'test-suite-health.test.js')
    .map(f => ({
      name: f,
      content: fs.readFileSync(path.join(TESTS_DIR, f), 'utf-8'),
    }));
}

/** List files in a directory matching a suffix. */
function listFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(suffix));
}

const testFiles = readTestFiles();

// ============================================================================
// TEST 1 — Every source file has test coverage somewhere
// ============================================================================

for (const { dir, ext, label } of SOURCE_DIRS) {
  const sourceFiles = listFiles(dir, ext);
  if (sourceFiles.length === 0) continue;

  // Detect suites that dynamically scan the directory
  const dynamicScanSuites = testFiles.filter(t =>
    new RegExp(`readdirSync.*${label}`, 'i').test(t.content)
  );

  describe(`${label}/ file test coverage`, () => {
    test.each(sourceFiles.map(f => [f]))(
      `${label}/%s is referenced in at least one test suite`,
      (fileName) => {
        const baseName = fileName.replace(ext, '');
        const referenced =
          testFiles.some(t =>
            t.content.includes(fileName) ||
            t.content.includes(baseName)
          ) ||
          dynamicScanSuites.length > 0;
        expect(referenced).toBe(true);
      }
    );
  });
}

// ============================================================================
// TEST 2 — No accidentally skipped or exclusive tests
// ============================================================================

describe('No skipped or exclusive tests', () => {
  const skipPatterns = [
    { pattern: /\bxdescribe\s*\(/, label: 'xdescribe' },
    { pattern: /\bxit\s*\(/, label: 'xit' },
    { pattern: /\bdescribe\.skip\s*\(/, label: 'describe.skip' },
    { pattern: /\btest\.skip\s*\(/, label: 'test.skip' },
    { pattern: /\bit\.skip\s*\(/, label: 'it.skip' },
    { pattern: /\bdescribe\.only\s*\(/, label: 'describe.only' },
    { pattern: /\btest\.only\s*\(/, label: 'test.only' },
    { pattern: /\bit\.only\s*\(/, label: 'it.only' },
    { pattern: /\bfdescribe\s*\(/, label: 'fdescribe' },
    { pattern: /\bfit\s*\(/, label: 'fit' },
  ];

  for (const { pattern, label } of skipPatterns) {
    test.each(testFiles.map(f => [f.name, f.content]))(
      `%s has no ${label}()`,
      (name, content) => {
        const lines = content.split('\n');
        const matches = [];
        lines.forEach((line, idx) => {
          if (pattern.test(line)) {
            matches.push(`  Line ${idx + 1}: ${line.trim()}`);
          }
        });
        if (matches.length > 0) {
          throw new Error(`Found ${label} in ${name}:\n${matches.join('\n')}`);
        }
      }
    );
  }
});

// ============================================================================
// TEST 3 — No duplicate test descriptions within the same describe block
// ============================================================================

describe('Unique test descriptions', () => {
  test.each(testFiles.map(f => [f.name, f.content]))(
    '%s has no duplicate test descriptions',
    (name, content) => {
      const lines = content.split('\n');
      let currentDescribe = '__root__';
      const describeTests = {};
      const duplicates = [];

      for (const line of lines) {
        const describeMatch = line.match(/describe\s*\(\s*(['"`])(.+?)\1/);
        if (describeMatch) currentDescribe = describeMatch[2];

        const testMatch = line.match(/(?:^\s*(?:test|it)\s*\(\s*(['"`]))(.+?)\1/);
        if (!testMatch) continue;
        const desc = testMatch[2];

        // Skip parameterized templates and tiny false-positive matches
        if (/%[sipdj#]/.test(desc)) continue;
        if (desc.length < 5) continue;

        if (!describeTests[currentDescribe]) describeTests[currentDescribe] = {};
        if (describeTests[currentDescribe][desc]) {
          duplicates.push(`[${currentDescribe}] "${desc}"`);
        }
        describeTests[currentDescribe][desc] = true;
      }

      if (duplicates.length > 0) {
        throw new Error(
          `Found ${duplicates.length} duplicate test name(s) in ${name}:\n` +
          duplicates.map(d => `  ${d}`).join('\n')
        );
      }
    }
  );
});

// ============================================================================
// TEST 4 — No empty describe blocks
// ============================================================================

describe('No empty describe blocks', () => {
  test.each(testFiles.map(f => [f.name, f.content]))(
    '%s has no empty describe blocks',
    (name, content) => {
      const describeRegex = /describe\s*\(\s*(['"`])(.+?)\1\s*,\s*\(\)\s*=>\s*\{/g;
      let match;
      while ((match = describeRegex.exec(content)) !== null) {
        const startIdx = match.index + match[0].length;
        let depth = 1;
        let i = startIdx;
        while (i < content.length && depth > 0) {
          if (content[i] === '{') depth++;
          if (content[i] === '}') depth--;
          i++;
        }
        const block = content.substring(startIdx, i - 1);
        const hasTests = /\b(test|it|describe)\s*[.(]/.test(block);
        if (!hasTests) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          throw new Error(`Empty describe block in ${name} at line ${lineNum}: "${match[2]}"`);
        }
      }
    }
  );
});

// ============================================================================
// TEST 5 — All test files have a JSDoc header
// ============================================================================

describe('Test file header format', () => {
  test.each(testFiles.map(f => [f.name, f.content]))(
    '%s has a JSDoc file header',
    (name, content) => {
      const header = content.substring(0, content.indexOf('*/') + 2);
      expect(header).toMatch(/^\/\*\*/);
      expect(header.length).toBeGreaterThan(50);
    }
  );
});

// ============================================================================
// TEST 6 — No suspiciously small test files
// ============================================================================

describe('Test suite metrics', () => {
  test('no test file is suspiciously small (< 500 bytes)', () => {
    const tinyTests = testFiles.filter(f => f.content.length < 500);
    if (tinyTests.length > 0) {
      throw new Error(
        `Suspiciously small test file(s):\n` +
        tinyTests.map(f => `  ${f.name} (${f.content.length} bytes)`).join('\n')
      );
    }
  });

  test('total describe blocks > total test files (tests are organized)', () => {
    let describeCount = 0;
    for (const f of testFiles) {
      const matches = f.content.match(/\bdescribe\s*\(/g);
      if (matches) describeCount += matches.length;
    }
    expect(describeCount).toBeGreaterThan(testFiles.length);
  });
});

// ============================================================================
// TEST 7 — Jest config and package.json are valid
// ============================================================================

describe('Test infrastructure', () => {
  // ADAPT: Change config path if yours is different
  const pkgPath = path.resolve(ROOT_DIR, 'package.json');

  test('package.json has a "test" script', () => {
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts.test).toMatch(/jest/i);
  });

  test('jest is listed as a dependency', () => {
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    expect(allDeps.jest).toBeDefined();
  });
});

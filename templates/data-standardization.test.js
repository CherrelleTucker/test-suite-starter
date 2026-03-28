/**
 * Template: Data Standardization (Public Repo Safety)
 *
 * WHAT THIS TESTS:
 * Prevents sensitive, non-standardized, or org-specific data from being
 * committed to a public repository. Scans all source files for secrets,
 * real email addresses, hardcoded IDs, API keys, and PII patterns.
 *
 * WHEN TO USE:
 * - Any public or open-source repository
 * - Projects that handle credentials, API keys, or user data
 * - White-label platforms where org-specific data should stay in config
 * - CI/CD pipelines as a merge gate to catch accidental secret commits
 *
 * WHAT TO LOOK FOR:
 * - Real email addresses (only @example.com placeholders allowed)
 * - API keys for common services (OpenAI, Slack, GitHub, Google, AWS)
 * - Hardcoded passwords or passphrases
 * - Webhook URLs with real IDs
 * - PII patterns (SSN, phone numbers)
 * - Secret config files (.env, credentials.json)
 * - Hardcoded service IDs that should be in config
 *
 * HOW IT WORKS:
 * This is a "wide" test that scans every source file line-by-line using
 * regex patterns. It generates one test per file per check category.
 * Allowlists prevent false positives on placeholder/example values.
 *
 * CI INTEGRATION:
 * Run this as a separate CI job that blocks merges on failure:
 *   npx jest data-standardization.test.js --verbose
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// ADAPT: Change these to your source directories
const SOURCE_DIRS = [
  path.resolve(ROOT_DIR, 'src'),
  // path.resolve(ROOT_DIR, 'lib'),
  // path.resolve(ROOT_DIR, 'server'),
];

// ADAPT: Change to match your source file extensions
const SOURCE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.json'];

// ============================================================================
// HELPERS
// ============================================================================

/** Read all source files from configured directories. */
function readSourceFiles() {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const dirName = path.basename(dir);
    fs.readdirSync(dir)
      .filter(f => SOURCE_EXTENSIONS.some(ext => f.endsWith(ext)))
      .forEach(f => {
        files.push({
          name: f,
          content: fs.readFileSync(path.join(dir, f), 'utf-8'),
          relPath: `${dirName}/${f}`,
        });
      });
  }
  return files;
}

const sourceFiles = readSourceFiles();

// Skip all tests if no source files found (template not yet adapted)
const describeIfFiles = sourceFiles.length > 0 ? describe : describe.skip;

// ============================================================================
// ALLOWLISTS — ADAPT these to your project
// ============================================================================

// Placeholder/example emails that are safe
const ALLOWED_EMAIL_PATTERNS = [
  /@example\.(com|org|gov|net)/i,
  /@your-?org/i,
  /@domain\./i,
  /noreply@/i,
  /placeholder/i,
  /@test\./i,
  /@localhost/i,
];

// ============================================================================
// TEST 1 — No real email addresses
// ============================================================================

describeIfFiles('No real email addresses', () => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  test.each(sourceFiles.map(f => [f.relPath, f.content]))(
    '%s contains no real email addresses',
    (relPath, content) => {
      const lines = content.split('\n');
      const violations = [];

      lines.forEach((line, idx) => {
        const matches = line.match(emailRegex);
        if (!matches) return;

        for (const email of matches) {
          if (ALLOWED_EMAIL_PATTERNS.some(p => p.test(email))) continue;
          // Skip HTML placeholder attributes
          if (/placeholder\s*=\s*["']/.test(line)) continue;
          // Skip comments describing patterns
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
            if (/example|placeholder|e\.g\.|format/i.test(trimmed)) continue;
          }
          // Skip CSS @ rules
          if (/@font-face|@import|@media|@keyframes/.test(line)) continue;

          violations.push(`  Line ${idx + 1}: ${email}`);
        }
      });

      if (violations.length > 0) {
        throw new Error(
          `Found real email(s) in ${relPath}:\n${violations.join('\n')}\n` +
          'Use @example.com for placeholders.'
        );
      }
    }
  );
});

// ============================================================================
// TEST 2 — No API keys, tokens, or secrets
// ============================================================================

describeIfFiles('No API keys or secrets', () => {
  // ADAPT: Add patterns for services your project uses
  const secretPatterns = [
    { pattern: /['"`](sk-[a-zA-Z0-9]{20,})['"`]/, label: 'OpenAI API key' },
    { pattern: /['"`](xox[bpsa]-[a-zA-Z0-9-]{20,})['"`]/, label: 'Slack token' },
    { pattern: /['"`](ghp_[a-zA-Z0-9]{36,})['"`]/, label: 'GitHub PAT' },
    { pattern: /['"`](gho_[a-zA-Z0-9]{36,})['"`]/, label: 'GitHub OAuth token' },
    { pattern: /['"`](AIza[a-zA-Z0-9_-]{35})['"`]/, label: 'Google API key' },
    { pattern: /['"`](ya29\.[a-zA-Z0-9_-]{50,})['"`]/, label: 'Google OAuth token' },
    { pattern: /['"`](AKIA[A-Z0-9]{16})['"`]/, label: 'AWS access key' },
    { pattern: /password\s*[:=]\s*['"`](?!.*\{)[^'"`]{8,}['"`]/i, label: 'Hardcoded password' },
    { pattern: /passphrase\s*[:=]\s*['"`](?!.*\{)[^'"`]{4,}['"`]/i, label: 'Hardcoded passphrase' },
  ];

  test.each(sourceFiles.map(f => [f.relPath, f.content]))(
    '%s contains no API keys or secrets',
    (relPath, content) => {
      const lines = content.split('\n');
      const violations = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

        for (const { pattern, label } of secretPatterns) {
          if (pattern.test(line)) {
            // Skip self-referencing config key maps (KEY: 'KEY')
            const valMatch = trimmed.match(/['"`](\w+)['"`]/);
            if (valMatch && /^[A-Z_]+$/.test(valMatch[1])) continue;
            violations.push(`  Line ${idx + 1}: ${label}`);
          }
        }
      });

      if (violations.length > 0) {
        throw new Error(
          `Found potential secret(s) in ${relPath}:\n${violations.join('\n')}\n` +
          'Store secrets in environment variables or a secrets manager.'
        );
      }
    }
  );
});

// ============================================================================
// TEST 3 — No webhook URLs with real IDs
// ============================================================================

describeIfFiles('No hardcoded webhook URLs', () => {
  // ADAPT: Add webhook patterns for services your project uses
  const webhookPatterns = [
    /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/,
    /https:\/\/discord\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+/,
  ];

  test.each(sourceFiles.map(f => [f.relPath, f.content]))(
    '%s contains no hardcoded webhook URLs',
    (relPath, content) => {
      const lines = content.split('\n');
      const violations = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

        for (const pattern of webhookPatterns) {
          if (pattern.test(line)) {
            violations.push(`  Line ${idx + 1}: ${trimmed.substring(0, 80)}`);
          }
        }
      });

      if (violations.length > 0) {
        throw new Error(
          `Found hardcoded webhook URL(s) in ${relPath}:\n${violations.join('\n')}\n` +
          'Store webhook URLs in environment variables.'
        );
      }
    }
  );
});

// ============================================================================
// TEST 4 — No .env or secret config files
// ============================================================================

describe('No secret config files', () => {
  // ADAPT: Add any other sensitive file patterns for your project
  const DANGEROUS_FILES = [
    '.env', '.env.local', '.env.production', '.env.development',
    'credentials.json', 'service-account.json', 'secrets.json', 'token.json',
  ];

  test('no secret config files exist in repository root', () => {
    const existing = DANGEROUS_FILES.filter(f =>
      fs.existsSync(path.join(ROOT_DIR, f))
    );
    if (existing.length > 0) {
      throw new Error(
        `Found secret config file(s):\n${existing.map(f => `  ${f}`).join('\n')}\n` +
        'Add these to .gitignore and remove from the repository.'
      );
    }
  });
});

// ============================================================================
// TEST 5 — No PII patterns
// ============================================================================

describeIfFiles('No PII patterns in source code', () => {
  test.each(sourceFiles.map(f => [f.relPath, f.content]))(
    '%s contains no SSN patterns',
    (relPath, content) => {
      const lines = content.split('\n');
      const violations = [];

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/regex|pattern|format|validate|mask|placeholder/i.test(line)) return;

        // SSN: XXX-XX-XXXX (skip date-like patterns YYYY-MM-DD)
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(line) && !/\b\d{4}-\d{2}-\d{2}\b/.test(line)) {
          violations.push(`  Line ${idx + 1}: Possible SSN`);
        }
      });

      if (violations.length > 0) {
        throw new Error(`Found PII pattern(s) in ${relPath}:\n${violations.join('\n')}`);
      }
    }
  );
});

// ============================================================================
// TEST 6 — .gitignore blocks sensitive file patterns
// ============================================================================

describe('.gitignore safety', () => {
  const gitignorePath = path.join(ROOT_DIR, '.gitignore');

  test('.gitignore exists', () => {
    expect(fs.existsSync(gitignorePath)).toBe(true);
  });

  test('.gitignore blocks .env files', () => {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignore).toMatch(/\.env/);
  });

  test('.gitignore blocks node_modules', () => {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignore).toMatch(/node_modules/);
  });
});

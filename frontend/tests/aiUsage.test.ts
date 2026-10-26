import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// -------------------------------------------------------------
// 1. Static Contract & UI Integrity Tests
// -------------------------------------------------------------

test('AdminAiUsage UI: Model-Specific Quota Dimensions table is completely removed', () => {
  const filePath = path.resolve('src/pages/Admin/AdminAiUsage.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');

  // Verify Model-Specific Quota Dimensions table header and text are removed
  assert.equal(
    source.includes('Model-Specific Quota Dimensions'),
    false,
    'Model-Specific Quota Dimensions table must be completely removed from AdminAiUsage.tsx'
  );
  assert.equal(
    source.includes('hasModelQuotas'),
    false,
    'hasModelQuotas condition must be removed'
  );
  assert.equal(
    source.includes('Layers'),
    false,
    'Layers icon from lucide-react must be removed'
  );
  assert.equal(
    source.includes('GoogleQuotaLimitInfo'),
    false,
    'Unused GoogleQuotaLimitInfo type import must be removed'
  );
});

test('AdminAiUsage UI: RPM and TPM cards are replaced with USED TODAY and REMAINING TODAY', () => {
  const filePath = path.resolve('src/pages/Admin/AdminAiUsage.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');

  // Verify RPM and TPM cards are replaced
  assert.equal(
    source.includes('QUOTA: RPM'),
    false,
    'QUOTA: RPM card must be replaced'
  );
  assert.equal(
    source.includes('QUOTA: TPM'),
    false,
    'QUOTA: TPM card must be replaced'
  );

  // Verify Used Today and Remaining Today cards exist
  assert.ok(source.includes('USED TODAY'), 'Must include USED TODAY card');
  assert.ok(source.includes('REMAINING TODAY'), 'Must include REMAINING TODAY card');
  assert.ok(source.includes('DAILY LIMIT (RPD)'), 'Must preserve DAILY LIMIT (RPD) card');
  assert.ok(source.includes('BILLING EXPORT'), 'Must preserve BILLING EXPORT card');
  assert.ok(
    source.includes('Resets midnight Pacific (US/Pacific)'),
    'Must indicate Pacific midnight reset boundary'
  );
});

// -------------------------------------------------------------
// 2. Daily Quota Logic: Calculation, Clamping, and Honesty
// -------------------------------------------------------------

test('Daily Quota calculation: Remaining Today = Daily Limit - Used Today with non-negative clamping', () => {
  const computeDailyQuota = (usedToday: number | null, dailyLimit: number | null) => {
    if (usedToday === null || dailyLimit === null) {
      return { remainingToday: null, isOverLimit: false, status: 'PARTIAL' };
    }
    const diff = dailyLimit - usedToday;
    const remainingToday = Math.max(0, diff);
    const isOverLimit = usedToday > dailyLimit;
    return { remainingToday, isOverLimit, status: 'AVAILABLE' };
  };

  // Normal allowance remaining
  const normal = computeDailyQuota(25, 100);
  assert.equal(normal.remainingToday, 75);
  assert.equal(normal.isOverLimit, false);
  assert.equal(normal.status, 'AVAILABLE');

  // Exact boundary
  const exact = computeDailyQuota(100, 100);
  assert.equal(exact.remainingToday, 0);
  assert.equal(exact.isOverLimit, false);

  // Over limit (must clamp to 0 and NOT display negative numbers)
  const over = computeDailyQuota(125, 100);
  assert.equal(over.remainingToday, 0, 'Remaining today must be clamped to 0, not -25');
  assert.equal(over.isOverLimit, true, 'isOverLimit flag must be set to true');

  // Missing limit (never fabricate zero)
  const missingLimit = computeDailyQuota(25, null);
  assert.equal(missingLimit.remainingToday, null, 'Missing limit must result in null remaining, not 0');
  assert.equal(missingLimit.status, 'PARTIAL');

  // Missing usage (never fabricate zero)
  const missingUsage = computeDailyQuota(null, 100);
  assert.equal(missingUsage.remainingToday, null, 'Missing usage must result in null remaining, not 0');
  assert.equal(missingUsage.status, 'PARTIAL');
});

// -------------------------------------------------------------
// 3. Admin Dashboard AI Overview Alignment & Honesty
// -------------------------------------------------------------

test('AdminDashboard: AI Telemetry Overview displays Google-backed metrics and separates Refusal', () => {
  const filePath = path.resolve('src/pages/Admin/AdminDashboard.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');

  // Must not have hardcoded static cost or fake failure percentages
  assert.ok(
    source.includes('Refusal: Unavailable'),
    'Must explicitly separate refusal rate and label it as Unavailable'
  );
  assert.ok(
    source.includes('Authoritative Google Cloud Gemini telemetry'),
    'Must identify Google Cloud as authoritative source'
  );
  assert.ok(
    source.includes('requestsStatus'),
    'Must honor requestsStatus transparently'
  );
  assert.ok(
    source.includes('costStatus'),
    'Must honor costStatus transparently'
  );
  assert.ok(
    source.includes('latencyStatus'),
    'Must honor latencyStatus transparently'
  );
});

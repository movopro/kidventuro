import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deliveryVerdict, main, planRecord } from '../src/record-status.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const workflow = fs.readFileSync(path.join(here, '..', '..', '.github', 'workflows', 'social-autopilot.yml'), 'utf8');
const slotKey = '2026-09-29-afternoon';
const sentReport = {
  slot: 'afternoon',
  slotKey,
  outcome: 'sent',
  platforms: { pinterest: { postId: 'p1', status: 'sent', externalLink: 'https://www.pinterest.com/pin/1' } }
};

const scratch = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'record-status-'));
  fs.mkdirSync(path.join(root, 'social-autopilot', 'status'), { recursive: true });
  return root;
};
const statusFile = (root, name) => path.join(root, 'social-autopilot', 'status', name);
const quietly = (fn) => {
  const { log, error } = console;
  console.log = console.error = () => {};
  try { return fn(); } finally { console.log = log; console.error = error; }
};

test('a run that never claimed the slot records nothing and is healthy', () => {
  const plan = planRecord({ details: null, publishOutcome: 'success', slotKey, preflightConfigured: 'true', now: 't' });
  assert.equal(plan.write, false);
  assert.equal(deliveryVerdict({ details: null, publishOutcome: 'success', preflightConfigured: 'true' }).ok, true);
});

test('delivered and in-flight runs are recorded and healthy', () => {
  for (const outcome of ['sent', 'pending']) {
    const details = { ...sentReport, outcome };
    const plan = planRecord({ details, publishOutcome: 'success', event: 'schedule', slot: 'afternoon', slotKey, preflightConfigured: 'true', now: 't' });
    assert.equal(plan.write, true);
    assert.equal(plan.status.publishOutcome, 'success');
    assert.equal(plan.status.details.outcome, outcome);
    assert.equal(deliveryVerdict({ details, publishOutcome: 'success', preflightConfigured: 'true' }).ok, true);
  }
});

test('failures are still recorded as failures, so the watchdog and the gate see them', () => {
  const crashed = planRecord({ details: null, publishOutcome: 'failure', slotKey, preflightConfigured: 'true', now: 't' });
  assert.equal(crashed.write, true);
  assert.equal(crashed.status.publishOutcome, 'failure');
  assert.equal(deliveryVerdict({ details: null, publishOutcome: 'failure', preflightConfigured: 'true' }).ok, false);
  assert.equal(deliveryVerdict({ details: null, publishOutcome: '', preflightConfigured: 'false' }).ok, false, 'missing keys must stay loud');
  assert.equal(deliveryVerdict({ details: { ...sentReport, outcome: 'failed' }, publishOutcome: 'success', preflightConfigured: 'true' }).ok, false);
});

test('regression 2026-09-29 14:17: a skipped re-run leaves the posted slot record untouched', () => {
  const root = scratch();
  const good = `${JSON.stringify({ publishOutcome: 'success', slotKey, details: sentReport }, null, 2)}\n`;
  fs.writeFileSync(statusFile(root, `${slotKey}.json`), good);
  fs.writeFileSync(statusFile(root, 'latest.json'), good);
  const env = { PUBLISH_OUTCOME: 'success', LIVE_PUBLISH_OUTCOME: 'success', PREFLIGHT_CONFIGURED: 'true', SLOT: 'afternoon', SLOT_KEY: slotKey, EVENT_NAME: 'workflow_dispatch' };
  assert.equal(quietly(() => main('record', root, env)), 0);
  assert.equal(fs.readFileSync(statusFile(root, `${slotKey}.json`), 'utf8'), good);
  assert.equal(fs.readFileSync(statusFile(root, 'latest.json'), 'utf8'), good);
  assert.equal(quietly(() => main('verify', root, env)), 0, 'the delivery check must not fail a run that did nothing');
});

test('a normal publish run writes latest.json and the slot record from run-result.json', () => {
  const root = scratch();
  fs.writeFileSync(statusFile(root, 'run-result.json'), JSON.stringify(sentReport));
  const env = { PUBLISH_OUTCOME: 'success', LIVE_PUBLISH_OUTCOME: 'success', PREFLIGHT_CONFIGURED: 'true', SLOT: 'afternoon', SLOT_KEY: slotKey, EVENT_NAME: 'schedule' };
  assert.equal(quietly(() => main('record', root, env)), 0);
  const written = JSON.parse(fs.readFileSync(statusFile(root, `${slotKey}.json`), 'utf8'));
  assert.equal(written.publishOutcome, 'success');
  assert.deepEqual(written.details, sentReport);
  assert.deepEqual(JSON.parse(fs.readFileSync(statusFile(root, 'latest.json'), 'utf8')), written);
  assert.equal(quietly(() => main('verify', root, env)), 0);
});

test('a crash before the report is recorded as a failure and fails the check', () => {
  const root = scratch();
  const env = { PUBLISH_OUTCOME: 'failure', LIVE_PUBLISH_OUTCOME: 'failure', PREFLIGHT_CONFIGURED: 'true', SLOT: 'afternoon', SLOT_KEY: slotKey, EVENT_NAME: 'schedule' };
  assert.equal(quietly(() => main('record', root, env)), 0);
  assert.equal(JSON.parse(fs.readFileSync(statusFile(root, `${slotKey}.json`), 'utf8')).publishOutcome, 'failure');
  assert.equal(quietly(() => main('verify', root, env)), 1);
});

test('only a successful report-less run counts as held elsewhere; partial, skipped and cancelled stay loud', () => {
  const partial = { ...sentReport, outcome: 'partial' };
  assert.equal(planRecord({ details: partial, publishOutcome: 'success', slotKey, preflightConfigured: 'true', now: 't' }).write, true);
  assert.equal(deliveryVerdict({ details: partial, publishOutcome: 'success', preflightConfigured: 'true' }).ok, false, 'a partly failed post must fail the check');
  for (const publishOutcome of ['skipped', 'cancelled', 'failure', '', undefined]) {
    const plan = planRecord({ details: null, publishOutcome, slotKey, preflightConfigured: 'true', now: 't' });
    assert.equal(plan.write, true, `${publishOutcome} must still be recorded`);
    assert.equal(deliveryVerdict({ details: null, publishOutcome, preflightConfigured: 'true' }).ok, false, `${publishOutcome} must fail the check`);
  }
});

test('run as a command, the way the workflow runs it, verify sets the exit code', () => {
  const script = path.join(here, '..', 'src', 'record-status.mjs');
  const run = (env) => spawnSync(process.execPath, [script, 'verify'], { cwd: scratch(), env: { ...process.env, ...env }, encoding: 'utf8' });
  const held = run({ LIVE_PUBLISH_OUTCOME: 'success', PREFLIGHT_CONFIGURED: 'true' });
  assert.equal(held.status, 0, held.stderr);
  assert.match(held.stdout, /Another runner holds this slot/);
  const broken = run({ LIVE_PUBLISH_OUTCOME: 'failure', PREFLIGHT_CONFIGURED: 'true' });
  assert.equal(broken.status, 1, 'a failed publish must fail the workflow step');
  assert.match(broken.stderr, /Live delivery unhealthy/);
});

test('the publish workflow records and verifies through this module', () => {
  assert.match(workflow, /node social-autopilot\/src\/record-status\.mjs record/);
  assert.match(workflow, /node social-autopilot\/src\/record-status\.mjs verify/);
  assert.equal(workflow.includes('let details = null;'), false, 'the old inline recorder must not come back');
});

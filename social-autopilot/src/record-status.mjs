// What a GitHub Actions publish run records, and whether its delivery is healthy.
//
// run.mjs writes status/run-result.json for every run that claimed the slot. A run
// that finds the slot claimed by another runner (Node 2, or an earlier Actions run
// still inside its 30-minute claim) exits quietly WITHOUT a report. Recording that
// run as `{ publishOutcome: 'success', details: null }` overwrote the claim holder's
// record - post ids and links gone, and gate.mjs then saw the slot as incomplete
// and kept re-running it - and the delivery check failed on the missing details
// (seen 2026-09-29 14:17). Such a run did nothing, so it records nothing.
//
// Node 2's run-slot.sh already behaves this way: no report, nothing recorded.
//
// Known limit (review 2026-09-29): a run whose OWN claim push keeps failing reads its
// unpushed claim back as 'already-claimed', so it also ends here, green and silent.
// The post is not lost to this - Node 2 or a later run takes the slot - and the Node 1
// social watchdog alerts on any slot that ends unposted.
//
//   node social-autopilot/src/record-status.mjs record   # writes latest.json + <slotKey>.json
//   node social-autopilot/src/record-status.mjs verify   # exit 1 when delivery is unhealthy
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RESULT_PATH = 'social-autopilot/status/run-result.json';
const STATUS_DIR = 'social-autopilot/status';

// The run exited successfully without a report: it never held the slot.
export const heldElsewhere = ({ details, publishOutcome }) => publishOutcome === 'success' && !details;

export function planRecord({ details, publishOutcome, event, slot, slotKey, preflightConfigured, now }) {
  if (heldElsewhere({ details, publishOutcome })) {
    return { write: false, reason: 'the slot is held by another runner; its record is left as it is' };
  }
  const status = {
    updatedAt: now,
    event: event || null,
    slot: slot || null,
    slotKey: slotKey || details?.slotKey || null,
    preflightConfigured: preflightConfigured || 'false',
    publishOutcome: publishOutcome || 'skipped',
    details: details || null
  };
  return { write: true, status };
}

export function deliveryVerdict({ details, publishOutcome, preflightConfigured }) {
  if (heldElsewhere({ details, publishOutcome })) {
    return { ok: true, message: 'Another runner holds this slot; nothing to verify here.' };
  }
  const outcome = details?.outcome || 'missing';
  if (preflightConfigured !== 'true' || publishOutcome !== 'success' || !['sent', 'pending'].includes(outcome)) {
    return { ok: false, message: `Live delivery unhealthy: preflight=${preflightConfigured}, publish=${publishOutcome}, outcome=${outcome}` };
  }
  return {
    ok: true,
    message: outcome === 'pending'
      ? 'Delivery accepted by Buffer and still in flight; a later watchdog run will verify final sent state without creating duplicates.'
      : 'All configured platforms are confirmed sent.'
  };
}

const readDetails = (root) => {
  const file = path.join(root, RESULT_PATH);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

function main(command, root = process.cwd(), env = process.env) {
  const details = readDetails(root);
  if (command === 'record') {
    const plan = planRecord({
      details,
      publishOutcome: env.PUBLISH_OUTCOME,
      event: env.EVENT_NAME,
      slot: env.SLOT,
      slotKey: env.SLOT_KEY,
      preflightConfigured: env.PREFLIGHT_CONFIGURED,
      now: new Date().toISOString()
    });
    if (!plan.write) {
      console.log(`Not recording: ${plan.reason}.`);
      return 0;
    }
    const dir = path.join(root, STATUS_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const body = `${JSON.stringify(plan.status, null, 2)}\n`;
    fs.writeFileSync(path.join(dir, 'latest.json'), body);
    const { slotKey } = plan.status;
    if (slotKey && slotKey !== 'none' && /^[a-zA-Z0-9._-]+$/.test(slotKey)) {
      fs.writeFileSync(path.join(dir, `${slotKey}.json`), body);
    }
    return 0;
  }
  if (command === 'verify') {
    const verdict = deliveryVerdict({
      details,
      publishOutcome: env.LIVE_PUBLISH_OUTCOME,
      preflightConfigured: env.PREFLIGHT_CONFIGURED
    });
    (verdict.ok ? console.log : console.error)(verdict.message);
    return verdict.ok ? 0 : 1;
  }
  console.error('usage: node record-status.mjs record|verify');
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv[2]);
}

export { main };

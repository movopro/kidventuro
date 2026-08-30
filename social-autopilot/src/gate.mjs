import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..');
const config = JSON.parse(fs.readFileSync(path.join(autopilotRoot, 'config.json'), 'utf8'));
let forcedSlot = process.env.FORCE_SLOT?.trim();
let forcedSlotKey = '';
let postVariant = '';
const recoveryTrigger = process.env.RECOVERY_TRIGGER?.trim();
const scheduleExpr = process.env.SCHEDULE_EXPR?.trim();
const now = new Date();

const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
const localDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
const localHour = Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone,
  hour: '2-digit',
  hourCycle: 'h23'
}).format(now));

const emit = (slot, slotKeyOverride = '', variant = '') => {
  console.log(`should_run=${slot ? 'true' : 'false'}`);
  console.log(`slot=${slot || 'none'}`);
  console.log(`slot_key=${slot ? (slotKeyOverride || `${localDate}-${slot}`) : 'none'}`);
  console.log(`post_variant=${variant || ''}`);
};

const slotIsComplete = (slot) => {
  const slotKey = `${localDate}-${slot}`;
  const statusPath = path.join(autopilotRoot, 'status', `${slotKey}.json`);
  if (!fs.existsSync(statusPath)) return false;
  try {
    const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    return status.publishOutcome === 'success'
      && status.details?.slotKey === slotKey
      && status.details?.outcome === 'sent';
  } catch {
    return false;
  }
};

if (!forcedSlot && recoveryTrigger) {
  const triggerPath = path.isAbsolute(recoveryTrigger)
    ? recoveryTrigger
    : path.resolve(process.cwd(), recoveryTrigger);
  const trigger = JSON.parse(fs.readFileSync(triggerPath, 'utf8'));
  forcedSlot = String(trigger.slot || '').trim();
  forcedSlotKey = String(trigger.slotKey || '').trim();
  postVariant = String(trigger.postVariant || '').trim();
}

if (forcedSlot) {
  if (!(forcedSlot in config.slots)) throw new Error(`Unknown slot: ${forcedSlot}`);
  if (forcedSlotKey && !/^[a-zA-Z0-9._-]+$/.test(forcedSlotKey)) throw new Error(`Unsafe forced slot key: ${forcedSlotKey}`);
  emit(forcedSlot, forcedSlotKey, postVariant);
  process.exit(0);
}

if (scheduleExpr) {
  // A frequent watchdog is more reliable than exact-time GitHub cron jobs, which
  // can be delayed for hours. Only the earliest due, incomplete slot proceeds.
  if (scheduleExpr !== '23,53 * * * *') {
    emit(null);
    console.error(`Unknown scheduled cron expression: ${scheduleExpr}`);
    process.exit(0);
  }

  const dueSlots = Object.entries(config.slots)
    .sort(([, left], [, right]) => left - right)
    .filter(([, slotHour]) => localHour >= slotHour);
  const slot = dueSlots.find(([name]) => !slotIsComplete(name))?.[0] || null;
  emit(slot);
  process.exit(0);
}

// Fallback for direct invocations that do not provide a schedule expression.
const slot = Object.entries(config.slots).find(([, slotHour]) => slotHour === localHour)?.[0] || null;
emit(slot);

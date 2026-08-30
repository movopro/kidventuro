import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, '..', 'config.json'), 'utf8'));
let forcedSlot = process.env.FORCE_SLOT?.trim();
const recoveryTrigger = process.env.RECOVERY_TRIGGER?.trim();
const scheduleExpr = process.env.SCHEDULE_EXPR?.trim();

if (!forcedSlot && recoveryTrigger) {
  const triggerPath = path.isAbsolute(recoveryTrigger)
    ? recoveryTrigger
    : path.resolve(process.cwd(), recoveryTrigger);
  const trigger = JSON.parse(fs.readFileSync(triggerPath, 'utf8'));
  forcedSlot = String(trigger.slot || '').trim();
}

if (forcedSlot) {
  if (!(forcedSlot in config.slots)) throw new Error(`Unknown slot: ${forcedSlot}`);
  console.log('should_run=true');
  console.log(`slot=${forcedSlot}`);
  process.exit(0);
}

const localHour = Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone,
  hour: '2-digit',
  hourCycle: 'h23'
}).format(new Date()));

// GitHub Actions cron jobs can start much later than their nominal trigger time.
// Keep separate cron groups for the two content slots, then accept a delayed run
// any time after that slot starts and before the next slot begins. The publisher's
// Cloudinary markers keep retries and the second DST candidate idempotent.
const scheduleSlots = new Map([
  ['17,47 6,7 * * *', 'morning'],
  ['17,47 15,16 * * *', 'evening']
]);

if (scheduleExpr) {
  const slot = scheduleSlots.get(scheduleExpr);
  if (!slot) {
    console.log('should_run=false');
    console.log('slot=none');
    console.error(`Unknown scheduled cron expression: ${scheduleExpr}`);
    process.exit(0);
  }

  const orderedSlots = Object.entries(config.slots).sort(([, a], [, b]) => a - b);
  const slotIndex = orderedSlots.findIndex(([name]) => name === slot);
  const startHour = config.slots[slot];
  const nextHour = slotIndex >= 0 && slotIndex < orderedSlots.length - 1
    ? orderedSlots[slotIndex + 1][1]
    : 24;
  const inWindow = localHour >= startHour && localHour < nextHour;

  console.log(`should_run=${inWindow ? 'true' : 'false'}`);
  console.log(`slot=${inWindow ? slot : 'none'}`);
  process.exit(0);
}

// Fallback for direct invocations that do not provide a schedule expression.
const slot = Object.entries(config.slots).find(([, slotHour]) => slotHour === localHour)?.[0];
console.log(`should_run=${slot ? 'true' : 'false'}`);
console.log(`slot=${slot || 'none'}`);

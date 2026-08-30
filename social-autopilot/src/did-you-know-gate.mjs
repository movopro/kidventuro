import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..');
const config = JSON.parse(fs.readFileSync(path.join(autopilotRoot, 'config.json'), 'utf8'));
const now = new Date();
const recoveryTrigger = process.env.RECOVERY_TRIGGER?.trim();
const forceRun = process.env.FORCE_RUN === 'true';

const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone,
  year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
const localDate = `${parts.year}-${parts.month}-${parts.day}`;
const localHour = Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone,
  hour: '2-digit', hourCycle: 'h23'
}).format(now));
const defaultSlot = Number(parts.day) % 2 === 0 ? 'morning' : 'evening';

const emit = ({ shouldRun, slot = defaultSlot, slotKey = '', sourceDate = '' }) => {
  console.log(`should_run=${shouldRun ? 'true' : 'false'}`);
  console.log(`slot=${shouldRun ? slot : 'none'}`);
  console.log(`slot_key=${shouldRun ? (slotKey || `${localDate}-did-you-know-${slot}`) : 'none'}`);
  console.log(`date_key=${localDate}`);
  console.log(`source_date=${sourceDate}`);
};

const statusPath = path.join(autopilotRoot, 'status', 'did-you-know', `${localDate}.json`);
const isComplete = () => {
  if (!fs.existsSync(statusPath)) return false;
  try {
    const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    return status.publishOutcome === 'success'
      && status.details?.outcome === 'sent'
      && String(status.details?.slotKey || '').includes('-did-you-know-');
  } catch {
    return false;
  }
};

if (recoveryTrigger) {
  const triggerPath = path.isAbsolute(recoveryTrigger) ? recoveryTrigger : path.resolve(process.cwd(), recoveryTrigger);
  const trigger = JSON.parse(fs.readFileSync(triggerPath, 'utf8'));
  const slot = String(trigger.slot || defaultSlot).trim();
  if (!(slot in config.slots)) throw new Error(`Unknown Did You Know slot: ${slot}`);
  const slotKey = String(trigger.slotKey || `${localDate}-did-you-know-${slot}`).trim();
  if (!/^[a-zA-Z0-9._-]+$/.test(slotKey)) throw new Error(`Unsafe Did You Know slot key: ${slotKey}`);
  emit({ shouldRun: true, slot, slotKey, sourceDate: String(trigger.sourceDate || '').trim() });
  process.exit(0);
}

if (forceRun) {
  emit({ shouldRun: true });
  process.exit(0);
}

// Daily due time is 14:00 Europe/Sofia. The hourly cron is only a watchdog:
// before 14:00 it does nothing; after 14:00 it runs only until today's post is sent.
if (localHour < 14 || isComplete()) {
  emit({ shouldRun: false });
  process.exit(0);
}

emit({ shouldRun: true });

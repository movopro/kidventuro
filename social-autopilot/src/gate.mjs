import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(here, '..', 'config.json'), 'utf8'));
const forcedSlot = process.env.FORCE_SLOT?.trim();

if (forcedSlot) {
  if (!(forcedSlot in config.slots)) throw new Error(`Unknown slot: ${forcedSlot}`);
  console.log('should_run=true');
  console.log(`slot=${forcedSlot}`);
  process.exit(0);
}

const hour = Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone,
  hour: '2-digit',
  hourCycle: 'h23'
}).format(new Date()));

const slot = Object.entries(config.slots).find(([, slotHour]) => slotHour === hour)?.[0];
console.log(`should_run=${slot ? 'true' : 'false'}`);
console.log(`slot=${slot || 'none'}`);

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claimSlot } from './src/claim.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = process.argv[2] || 'test-runner';
const slotKey = process.argv[3] || 'phase4-claim-test-1';

const result = await claimSlot({
  repoRoot: path.resolve(here, '..'),
  autopilotRoot: here,
  slotKey,
  runner
});
console.log(JSON.stringify(result, null, 2));

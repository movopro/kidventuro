import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const STALE_MS = 30 * 60 * 1000;

const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

/**
 * Claims a publish slot across runners (node2, node1, github) using a git-committed
 * marker file as the lock. A claim older than STALE_MS that never reached "sent" is
 * treated as abandoned so another runner may retake it; the caller still re-verifies
 * delivery via Buffer post IDs before publishing again, so a retake cannot duplicate a post.
 */
export async function claimSlot({ repoRoot, autopilotRoot, slotKey, runner, statusDir = 'status' }) {
  const claimPath = path.join(autopilotRoot, statusDir, `${slotKey}.claim.json`);
  const relClaimPath = path.relative(repoRoot, claimPath).split(path.sep).join('/');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      git(['pull', '--rebase', 'origin', 'main'], repoRoot);
    } catch (error) {
      console.warn(`claim: git pull --rebase failed (attempt ${attempt + 1}): ${error.message.split('\n')[0]}`);
    }

    let existing = null;
    try {
      existing = JSON.parse(await fs.readFile(claimPath, 'utf8'));
    } catch {
      existing = null;
    }

    if (existing) {
      const ageMs = Date.now() - new Date(existing.claimedAt).getTime();
      const stale = !Number.isFinite(ageMs) || ageMs > STALE_MS;
      if (!stale) {
        return { claimed: false, reason: 'already-claimed', existing };
      }
      console.warn(`claim: stale claim by ${existing.runner} at ${existing.claimedAt} for ${slotKey}; taking over`);
    }

    const marker = { runner, slotKey, claimedAt: new Date().toISOString() };
    await fs.mkdir(path.dirname(claimPath), { recursive: true });
    await fs.writeFile(claimPath, `${JSON.stringify(marker, null, 2)}\n`, 'utf8');

    try {
      git(['config', 'user.name', 'social-autopilot-bot'], repoRoot);
      git(['config', 'user.email', 'social-autopilot-bot@users.noreply.github.com'], repoRoot);
      git(['add', relClaimPath], repoRoot);
      git(['commit', '-m', `Claim ${slotKey} (${runner}) [skip ci]`], repoRoot);
      git(['push', 'origin', 'HEAD:main'], repoRoot);
      return { claimed: true, marker };
    } catch (pushError) {
      console.warn(`claim: push rejected (attempt ${attempt + 1}), re-checking: ${pushError.message.split('\n')[0]}`);
    }
  }
  return { claimed: false, reason: 'contention' };
}

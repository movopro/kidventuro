import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDestinations } from '../src/destinations.mjs';

test('loads the live Kidventuro destination catalog', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(here, '..', '..');
  const destinations = await loadDestinations(repositoryRoot);
  assert.ok(destinations.length >= 50);
  assert.ok(destinations.some((destination) => destination.name === 'Rome'));
  assert.ok(destinations.every((destination) => destination.missions.length >= 2));
});

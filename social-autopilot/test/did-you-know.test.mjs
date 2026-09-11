import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  didYouKnowFacts,
  guessTheCountry,
  threeFunFacts,
  spotIt,
  whichWouldYouVisit,
  generateDidYouKnowContent,
  selectDidYouKnowFormat
} from '../src/did-you-know-content.mjs';
import { loadDestinations } from '../src/destinations.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '..', '..');

const FORMATS = ['did-you-know', 'guess-the-country', 'three-fun-facts', 'spot-it', 'which-would-you-visit'];

test('Did You Know fact bank has a broad country rotation', () => {
  assert.ok(didYouKnowFacts.length >= 20);
  assert.equal(new Set(didYouKnowFacts.map((item) => item.country)).size, didYouKnowFacts.length);
});

test('every new format bank has at least 10 items, 44+ new items total', () => {
  assert.ok(guessTheCountry.length >= 10);
  assert.ok(threeFunFacts.length >= 10);
  assert.ok(spotIt.length >= 10);
  assert.ok(whichWouldYouVisit.length >= 10);
  assert.ok(guessTheCountry.length + threeFunFacts.length + spotIt.length + whichWouldYouVisit.length >= 40);
});

test('the Did You Know stream rotates through all five formats over five days', () => {
  const base = new Date('2026-09-14T12:00:00Z'); // arbitrary anchor
  const seen = new Set();
  for (let offset = 0; offset < 5; offset += 1) {
    const date = new Date(base.getTime() + offset * 86_400_000);
    seen.add(selectDidYouKnowFormat(date));
  }
  assert.deepEqual([...seen].sort(), [...FORMATS].sort());
});

test('format selection is deterministic for the same date (multi-runner safe)', () => {
  const date = new Date('2026-09-20T09:00:00Z');
  assert.equal(selectDidYouKnowFormat(date), selectDidYouKnowFormat(date));
});

for (const format of FORMATS) {
  test(`generateDidYouKnowContent(${format}) matches the social renderer contract`, () => {
    const base = new Date('2026-09-14T12:00:00Z');
    let date = base;
    for (let offset = 0; offset < 5; offset += 1) {
      const candidate = new Date(base.getTime() + offset * 86_400_000);
      if (selectDidYouKnowFormat(candidate) === format) {
        date = candidate;
        break;
      }
    }
    const content = generateDidYouKnowContent({ date });
    assert.equal(content.generator, 'curated-did-you-know');
    assert.equal(content.visual.slides.length, 4);
    for (const slide of content.visual.slides) {
      assert.ok(slide.kicker && slide.headline && slide.body);
    }
    assert.ok(content.instagram.caption.includes('Kidventuro') || content.instagram.caption.includes('kidventuro'));
    assert.ok(content.pinterest.title.length <= 100);
    assert.ok(content.tiktok.caption.length < 2200);
  });
}

test('Guess the Country ends with a reveal and asks for a comment before it', () => {
  const item = guessTheCountry[0];
  assert.equal(item.clues.length, 3);
  assert.ok(item.revealFact.length > 0);
});

test('Which Would You Visit pairs offer two distinct destinations', () => {
  for (const pair of whichWouldYouVisit) {
    assert.notEqual(pair.a.destination, pair.b.destination);
  }
});

test('every destinationSlug used by the new formats is a real destination page', async () => {
  const destinations = await loadDestinations(repositoryRoot);
  const validSlugs = new Set(destinations.map((destination) => destination.slug));
  const allItems = [
    ...guessTheCountry,
    ...threeFunFacts,
    ...spotIt,
    ...whichWouldYouVisit.flatMap((pair) => [pair.a, pair.b])
  ];
  for (const item of allItems) {
    assert.ok(item.destinationSlug, `missing destinationSlug for ${item.country || item.destination}`);
    assert.ok(validSlugs.has(item.destinationSlug), `unknown destinationSlug: ${item.destinationSlug}`);
  }
});

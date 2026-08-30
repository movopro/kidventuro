import test from 'node:test';
import assert from 'node:assert/strict';
import { didYouKnowFacts, generateDidYouKnowContent, selectDidYouKnowFact } from '../src/did-you-know-content.mjs';

test('Did You Know fact bank has a broad country rotation', () => {
  assert.ok(didYouKnowFacts.length >= 20);
  assert.equal(new Set(didYouKnowFacts.map((item) => item.country)).size, didYouKnowFacts.length);
});

test('Did You Know selection changes on consecutive UTC days', () => {
  const first = selectDidYouKnowFact(new Date('2026-08-30T12:00:00Z'));
  const second = selectDidYouKnowFact(new Date('2026-08-31T12:00:00Z'));
  assert.notEqual(first.country, second.country);
});

test('Did You Know content matches the social renderer contract', () => {
  const content = generateDidYouKnowContent({ date: new Date('2026-08-30T12:00:00Z') });
  assert.equal(content.generator, 'curated-did-you-know');
  assert.match(content.theme, /^Did you know\?/);
  assert.equal(content.visual.slides.length, 4);
  assert.ok(content.instagram.caption.includes('#DidYouKnow'));
  assert.ok(content.pinterest.title.length <= 100);
  assert.ok(content.tiktok.caption.includes('#Kidventuro'));
});

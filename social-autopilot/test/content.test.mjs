import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackContent, normalizeContent, selectSeed } from '../src/content.mjs';

const destinations = [
  { name: 'Rome', en: 'Ancient wonders • fountains • pizza', missions: ['Colosseum detective', 'Fountain clue hunt'] },
  { name: 'Paris', en: 'Towers • art • cafés', missions: ['Eiffel Tower spotter', 'Paris colour hunt'] }
];

test('content seed changes between morning and evening', () => {
  const date = new Date('2026-08-28T08:00:00Z');
  const morning = selectSeed(destinations, 'morning', date);
  const evening = selectSeed(destinations, 'evening', date);
  assert.notEqual(morning.sequence, evening.sequence);
  assert.notEqual(`${morning.destination.name}:${morning.pillar}`, `${evening.destination.name}:${evening.pillar}`);
});

test('fallback content is complete and normalized', () => {
  const seed = selectSeed(destinations, 'morning', new Date('2026-08-28T08:00:00Z'));
  const content = normalizeContent(fallbackContent(seed), seed, 'test');
  assert.equal(content.visual.slides.length, 4);
  assert.match(content.instagram.caption, /Kidventuro/);
  assert.match(content.pinterest.description, /printable/i);
  assert.ok(content.tiktok.caption.length < 2200);
});

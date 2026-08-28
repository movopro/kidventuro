import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAudioClip } from '../src/render.mjs';

const config = {
  slots: { morning: 9, evening: 18 },
  audio: {
    tracks: ['1.mp3', '2.mp3'],
    excerptStartRangeSeconds: 60
  }
};

test('audio tracks alternate across every consecutive publishing slot', () => {
  const sequence = [
    '2026-08-28-morning',
    '2026-08-28-evening',
    '2026-08-29-morning',
    '2026-08-29-evening'
  ].map((slotKey) => selectAudioClip(slotKey, config).track);

  assert.deepEqual(sequence, ['1.mp3', '2.mp3', '1.mp3', '2.mp3']);
});

test('excerpt selection is stable for retries and changes between dates', () => {
  const first = selectAudioClip('2026-08-28-morning', config);
  const retry = selectAudioClip('2026-08-28-morning', config);
  const nextDay = selectAudioClip('2026-08-29-morning', config);

  assert.deepEqual(first, retry);
  assert.notEqual(first.startSeconds, nextDay.startSeconds);
  assert.ok(first.startSeconds >= 0 && first.startSeconds < 60);
});

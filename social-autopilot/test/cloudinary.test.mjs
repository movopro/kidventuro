import test from 'node:test';
import assert from 'node:assert/strict';
import { sign } from '../src/cloudinary.mjs';

test('Cloudinary signature is stable regardless of parameter order', () => {
  const first = sign({ timestamp: 123, public_id: 'kidventuro/test', overwrite: 'true' }, 'secret');
  const second = sign({ overwrite: 'true', public_id: 'kidventuro/test', timestamp: 123 }, 'secret');
  assert.equal(first, second);
  assert.equal(first.length, 40);
});

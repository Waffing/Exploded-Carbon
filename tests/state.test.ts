import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, labReducer } from '../src/state/labReducer.ts';
import { specimens } from '../src/data/specimens.ts';

test('specimen switching preserves independent choices and frequencies', () => {
  let s = labReducer(initialState, { type: 'variant', layerId: 'coffee-cup', variantId: 'own-cup' });
  s = labReducer(s, { type: 'frequency', value: 7 });
  s = labReducer(s, { type: 'specimen', id: 'meal' });
  assert.equal(s.frequencies.meal, 4);
  assert.deepEqual(s.selections.meal, {});
  s = labReducer(s, { type: 'specimen', id: 'coffee' });
  assert.equal(s.frequencies.coffee, 7);
  assert.equal(s.selections.coffee['coffee-cup'], 'own-cup');
  assert.deepEqual(initialState.selections.coffee, {});
});
test('preset and reset are atomic and idempotent', () => {
  const s = labReducer(initialState, { type: 'preset' });
  assert.deepEqual(s.selections.coffee, specimens[0].preset);
  assert.deepEqual(labReducer(s, { type: 'preset' }), s);
  assert.deepEqual(labReducer(s, { type: 'reset' }).selections.coffee, {});
});
test('presentation modes never mutate scenario data', () => {
  let s = labReducer(initialState, { type: 'mode', mode: 'water' });
  s = labReducer(s, { type: 'layer', index: 4 });
  s = labReducer(s, { type: 'explosion', value: 400 });
  assert.equal(s.explosion, 100);
  assert.equal(s.layerIndex, 4);
  assert.equal(s.mode, 'water');
  assert.deepEqual(s.selections, initialState.selections);
  assert.equal(labReducer(s, { type: 'explosion', value: -30 }).explosion, 0);
});
test('invalid frequencies cannot enter state and zero is retained', () => {
  for (const value of [NaN, Infinity, -1, 367]) assert.deepEqual(labReducer(initialState, { type: 'frequency', value }), initialState);
  assert.equal(labReducer(initialState, { type: 'frequency', value: 0 }).frequencies.coffee, 0);
});

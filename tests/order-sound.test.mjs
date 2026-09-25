import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderSound } from '../src/pages/Admin/orderSound.js';
function fixture(play = () => Promise.resolve(), timeout) {
  let calls = 0, creations = 0, pauses = 0;
  const states = [];
  const audio = { currentTime: 9, muted: true, volume: 0, play() { calls++; return play(); }, pause() { pauses++; }, removeAttribute() {}, load() {} };
  const sound = createOrderSound(() => { creations++; return audio; }, state => states.push(state), timeout);
  return { sound, audio, states, calls: () => calls, creations: () => creations, pauses: () => pauses };
}
test('enable starts media synchronously, unmutes it and reports successful playback', async () => {
  const f = fixture();
  const result = f.sound.enable();
  assert.equal(f.calls(), 1);
  assert.equal(f.audio.volume, 1);
  assert.equal(f.audio.muted, false);
  assert.equal(f.audio.currentTime, 0);
  await result;
  assert.deepEqual(f.states.at(-1), { enabled: true, blocked: false });
  await f.sound.notify();
  assert.equal(f.calls(), 2);
  assert.equal(f.creations(), 1);
});
test('blocked notification remains pending and retries only once after recovery', async () => {
  let blocked = true;
  const f = fixture(() => blocked ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve());
  await f.sound.enable();
  assert.deepEqual(f.states.at(-1), { enabled: true, blocked: true });
  blocked = false;
  await f.sound.retry();
  await f.sound.retry();
  assert.equal(f.calls(), 2);
  assert.deepEqual(f.states.at(-1), { enabled: true, blocked: false });
});
test('muting cancels pending alerts and prevents late playback success from re-enabling sound', async () => {
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  const pending = f.sound.enable();
  f.sound.mute(); resolve(); await pending;
  await f.sound.notify(); await f.sound.retry();
  assert.equal(f.calls(), 1);
  assert.equal(f.pauses(), 1);
  assert.deepEqual(f.states.at(-1), { enabled: false, blocked: false });
});
test('stalled playback times out and disposal permits a fresh session', async () => {
  const f = fixture(() => new Promise(() => {}), 5);
  await f.sound.enable();
  assert.deepEqual(f.states.at(-1), { enabled: true, blocked: true });
  f.sound.dispose();
  await f.sound.enable();
  assert.equal(f.creations(), 2);
  f.sound.dispose();
});
test('automatic arming alerts for new orders without an enable click, including a fresh session', async () => {
  const f = fixture();
  f.sound.arm();
  assert.equal(f.calls(), 0);
  await f.sound.notify();
  assert.equal(f.calls(), 1);
  f.sound.dispose();
  f.sound.arm();
  await f.sound.notify();
  assert.equal(f.calls(), 2);
  assert.deepEqual(f.states.at(-1), { enabled: true, blocked: false });
});
test('ordinary interaction silently unlocks audio once and restores full alert volume', async () => {
  const f = fixture();
  f.sound.arm();
  const unlock = f.sound.unlock();
  assert.equal(f.audio.volume, 0);
  await unlock;
  assert.equal(f.audio.volume, 1);
  await f.sound.unlock();
  assert.equal(f.calls(), 1);
  await f.sound.notify();
  assert.equal(f.calls(), 2);
  assert.equal(f.audio.volume, 1);
});
test('ordinary interaction retries a blocked real alert audibly and respects explicit mute', async () => {
  let blocked = true;
  const f = fixture(() => blocked ? Promise.reject(new Error('blocked')) : Promise.resolve());
  f.sound.arm(); await f.sound.notify();
  blocked = false;
  await f.sound.unlock();
  assert.equal(f.audio.volume, 1);
  assert.deepEqual(f.states.at(-1), { enabled: true, blocked: false });
  f.sound.mute(); await f.sound.unlock(); await f.sound.notify();
  assert.equal(f.calls(), 2);
});

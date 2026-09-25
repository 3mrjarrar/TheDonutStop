// A media element uses normal media playback, with an explicit user-gesture unlock.
export function createOrderSound(createAudio, onState, timeoutMs = 3000) {
  let audio, enabled = false, pending = false, generation = 0, flight = null, unlocked = false;
  const report = (blocked = false) => onState({ enabled, blocked });
  function play(silent = false) {
    if (!enabled || (!pending && !silent)) return Promise.resolve();
    if (flight) return flight;
    const version = generation;
    silent = silent && !pending;
    let playback;
    try {
      if (!audio) audio = createAudio();
      audio.volume = silent ? 0 : 1;
      audio.muted = false;
      audio.currentTime = 0;
      // Must run before awaiting anything: browsers require the click's user activation.
      playback = audio.play();
    } catch { report(true); return Promise.resolve(); }
    let timer;
    const current = Promise.race([playback, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('AUDIO_TIMEOUT')), timeoutMs);
    })]).then(() => {
      if (version !== generation || !enabled) return;
      unlocked = true;
      if (silent) { audio.pause(); audio.currentTime = 0; audio.volume = 1; }
      else pending = false;
      report();
    }).catch(() => {
      if (version === generation && enabled) {
        audio.pause();
        report(true); // Keep pending so a later user gesture can retry this alert.
      }
    }).finally(() => { clearTimeout(timer); if (flight === current) { flight = null; if (silent && pending && enabled && version === generation) void play(); } });
    flight = current;
    return current;
  }
  return {
    arm() { enabled = true; report(); },
    unlock() { return unlocked ? play() : play(true); },
    enable() { enabled = true; pending = true; return play(); },
    notify() { if (!enabled) return Promise.resolve(); pending = true; return play(); },
    retry() { return play(); },
    mute() { generation++; enabled = false; pending = false; flight = null; unlocked = false; audio?.pause(); report(); },
    dispose() { this.mute(); if (audio) { audio.removeAttribute('src'); audio.load(); audio = null; } },
  };
}

// SlowGrap content script: applies speed + reverb + EQ to every <audio>/<video>.
// Speed uses playbackRate only. Reverb/EQ route the element through Web Audio, which is
// only done once a reverb/EQ slider is non-zero. Cross-origin media would go silent when
// captured (browser restriction), so such files are re-fetched via the background worker
// and loaded as a same-origin data: URL first. YouTube / YT Music use blob: sources -> fine.

const DEFAULTS = {
  enabled: true,
  speed: 1,
  preservePitch: false,
  reverb: 0,
  room: "hall",
  bass: 0,
  treble: 0,
};
// Room type = impulse response length / decay curve.
const ROOMS = {
  chambre: { seconds: 1.5, decay: 3 },
  hall: { seconds: 4, decay: 2 },
  cathedrale: { seconds: 7, decay: 1.5 },
};
let settings = { ...DEFAULTS };
let ctx;
const impulses = {}; // room -> AudioBuffer, built lazily
const wired = new WeakMap(); // el -> { bass, treble, conv, wet, dry }

const needsFx = () =>
  settings.enabled && (settings.reverb > 0 || settings.bass !== 0 || settings.treble !== 0);

function getImpulse(room) {
  const r = ROOMS[room] ? room : DEFAULTS.room;
  return (impulses[r] ??= makeImpulse(getCtx(), ROOMS[r].seconds, ROOMS[r].decay));
}

function makeImpulse(ac, seconds = 4, decay = 2) {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function resume() {
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
}

function getCtx() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  // Autoplay policy: context may start suspended; resume on any gesture and keep retrying.
  for (const ev of ["pointerdown", "keydown", "touchstart"])
    document.addEventListener(ev, resume, { capture: true, passive: true });
  setInterval(resume, 1000);
  return ctx;
}

// Cross-origin file (e.g. an mp3 on a CDN): swap in a same-origin copy so Web Audio isn't muted.
async function localize(el) {
  const src = el.currentSrc || el.src;
  if (
    !/^https?:/.test(src) ||
    new URL(src).origin === location.origin ||
    el.dataset.slowgrapSrc === src
  )
    return;
  el.dataset.slowgrapSrc = src;
  const r = await chrome.runtime
    .sendMessage({ type: "fetch", url: src })
    .catch((e) => ({ error: e.message }));
  if (!r?.dataUrl) return;
  const { currentTime, paused } = el;
  el.src = r.dataUrl;
  el.currentTime = currentTime;
  if (!paused) el.play().catch(() => {});
}

function wire(el) {
  if (wired.has(el)) return wired.get(el);
  const ac = getCtx();
  let src;
  try {
    src = ac.createMediaElementSource(el);
  } catch {
    wired.set(el, null);
    return null;
  } // already captured by the page
  const bass = ac.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 200;
  const treble = ac.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = 4000;
  const conv = ac.createConvolver();
  conv.buffer = getImpulse(settings.room);
  const wet = ac.createGain();
  wet.gain.value = 0;
  const dry = ac.createGain();
  dry.gain.value = 1;
  src.connect(bass);
  bass.connect(treble);
  treble.connect(dry);
  dry.connect(ac.destination);
  treble.connect(conv);
  conv.connect(wet);
  wet.connect(ac.destination);
  const g = { bass, treble, conv, wet, dry };
  wired.set(el, g);
  resume();
  return g;
}

// Only take over the rate while SlowGrap is actually changing it; otherwise leave the
// site's own speed control (YouTube menu, shortcuts) alone.
const ownsSpeed = () => settings.enabled && settings.speed !== 1;

function apply(el) {
  const s = settings.enabled ? settings : DEFAULTS;
  if (ownsSpeed()) {
    if (el.playbackRate !== s.speed) el.playbackRate = s.speed;
    el.preservesPitch = s.preservePitch;
    el.dataset.slowgrapRate = "1";
  } else if (el.dataset.slowgrapRate) {
    // Just turned off / reset to 1x: restore once, then stop interfering.
    delete el.dataset.slowgrapRate;
    el.playbackRate = 1;
    el.preservesPitch = true;
  }
  if (needsFx()) localize(el);
  const g = needsFx() ? wire(el) : wired.get(el);
  if (!g) return;
  g.wet.gain.value = s.reverb * 1; // wet louder than 1:1 so 100% is clearly drenched
  g.dry.gain.value = 1 - s.reverb * 0.25; // pull the dry down as reverb rises
  g.bass.gain.value = s.bass;
  g.treble.gain.value = s.treble;
  const ir = getImpulse(s.room);
  if (g.conv.buffer !== ir) g.conv.buffer = ir;
}

function attach(el) {
  if (el.dataset.slowgrap) return;
  el.dataset.slowgrap = "1";
  // Sites (YouTube) reset the rate on navigation / quality change; re-apply.
  for (const ev of ["ratechange", "loadedmetadata", "play", "playing"])
    el.addEventListener(ev, () => {
      resume();
      apply(el);
    });
  apply(el);
}

function scan(root = document) {
  root.querySelectorAll?.("audio,video").forEach(attach);
  if (root.matches?.("audio,video")) attach(root);
}

// Settings live in this tab only (popup sends them); a reload starts fresh at DEFAULTS.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "get") reply(settings);
  if (msg.type === "set") {
    settings = { ...DEFAULTS, ...msg.settings };
    scan();
    document.querySelectorAll("audio,video").forEach(apply);
  }
});
scan();
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach(scan))).observe(
  document.documentElement,
  { childList: true, subtree: true },
);

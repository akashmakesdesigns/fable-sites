// Shared plumbing for the two scroll-driven 3D pages: smoothed scroll progress through a tall
// section with a sticky stage, keyframe interpolation, and captions that fade by progress.

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (t) => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;

/** keys: [{ p, anyNumber, anyArray }...] sorted by p. Returns p => interpolated object. */
export function keyframes(keys) {
  return (p) => {
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const a = keys[i], b = keys[i + 1];
    const t = smooth(clamp01((p - a.p) / (b.p - a.p)));
    const out = {};
    for (const k in a) {
      if (k === 'p') continue;
      out[k] = Array.isArray(a[k]) ? a[k].map((v, j) => lerp(v, b[k][j], t)) : lerp(a[k], b[k], t);
    }
    return out;
  };
}

/** Tracks progress (0..1) of a sticky stage inside `section`, eased so wheel steps don't judder. */
export function scrollStage(section, { ease = 0.09 } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { target: 0, value: 0 };
  const read = () => {
    const banner = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--banner-h')) || 0;
    const span = section.offsetHeight - (innerHeight - banner);
    state.target = clamp01((banner - section.getBoundingClientRect().top) / span);
  };
  addEventListener('scroll', read, { passive: true });
  addEventListener('resize', read);
  read();
  state.value = state.target;
  state.tick = () => {
    read(); // re-read every frame: layout can settle after the first scroll event
    state.value = reduce ? state.target : lerp(state.value, state.target, ease);
    if (Math.abs(state.value - state.target) < 0.00005) state.value = state.target;
    return state.value;
  };
  return state;
}

/** Elements with data-in / data-out fade in and out as progress passes through that window. */
export function captions(root) {
  const items = [...root.querySelectorAll('[data-in]')].map((el) => ({ el, a: +el.dataset.in, b: +el.dataset.out }));
  return (p) => {
    for (const { el, a, b } of items) {
      const edge = 0.022;
      const inK = a <= 0 ? 1 : clamp01((p - a) / edge);
      const outK = b >= 1 ? 1 : clamp01((b - p) / edge);
      const o = smooth(Math.min(inK, outK));
      el.style.opacity = o;
      el.style.transform = `translateY(${(1 - o) * (p < (a + b) / 2 ? 26 : -26)}px)`;
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    }
  };
}

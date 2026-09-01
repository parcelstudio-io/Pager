function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function audioFeatures(timeDomain, frequencyDomain) {
  if (!timeDomain?.length) return { level: 0, tone: 0.5 };

  let sumSquares = 0;
  for (const sample of timeDomain) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumSquares / timeDomain.length);
  const level = clamp01((rms - 0.012) * 5.5);

  let weighted = 0;
  let magnitude = 0;
  for (let index = 0; index < (frequencyDomain?.length || 0); index += 1) {
    const value = frequencyDomain[index];
    weighted += index * value;
    magnitude += value;
  }
  const tone = magnitude > 0 && frequencyDomain.length > 1
    ? clamp01(weighted / magnitude / (frequencyDomain.length - 1))
    : 0.5;

  return { level, tone };
}

export class AudioReactiveHalo {
  constructor({
    element,
    createAudioContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
    requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
    cancelFrame = (handle) => globalThis.cancelAnimationFrame(handle),
    reducedMotion = () => globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false,
  }) {
    this.element = element;
    this.createAudioContext = createAudioContext;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.reducedMotion = reducedMotion;
    this.context = null;
    this.source = null;
    this.analyser = null;
    this.timeDomain = null;
    this.frequencyDomain = null;
    this.frame = null;
    this.level = 0;
    this.tone = 0.5;
    this.generation = 0;
    this.paint(0, 0.5);
  }

  attach(stream) {
    this.stop();
    if (!stream || !this.element) return false;

    try {
      this.context = this.createAudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.62;
      this.source = this.context.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.timeDomain = new Uint8Array(this.analyser.fftSize);
      this.frequencyDomain = new Uint8Array(this.analyser.frequencyBinCount);
      const resume = this.context.resume?.();
      resume?.catch?.(() => {});
      this.schedule();
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  schedule() {
    if (this.frame !== null || !this.analyser) return;
    const generation = this.generation;
    this.frame = this.requestFrame(() => {
      this.frame = null;
      if (generation !== this.generation || !this.analyser) return;
      this.update();
      this.schedule();
    });
  }

  update() {
    this.analyser.getByteTimeDomainData(this.timeDomain);
    this.analyser.getByteFrequencyData(this.frequencyDomain);
    const features = audioFeatures(this.timeDomain, this.frequencyDomain);
    this.level = this.level * 0.62 + features.level * 0.38;
    this.tone = this.tone * 0.78 + features.tone * 0.22;
    this.paint(this.reducedMotion() ? 0 : this.level, this.tone);
  }

  paint(level, tone) {
    if (!this.element) return;
    const safeLevel = clamp01(level);
    const safeTone = clamp01(tone);
    const toneOffset = safeTone - 0.5;
    this.element.style.setProperty("--halo-scale-x", (1 + safeLevel * (0.12 + safeTone * 0.04)).toFixed(4));
    this.element.style.setProperty("--halo-scale-y", (1 + safeLevel * (0.22 - safeTone * 0.04)).toFixed(4));
    this.element.style.setProperty("--halo-shift-x", `${(toneOffset * safeLevel * 7).toFixed(2)}px`);
    this.element.style.setProperty("--halo-rotation", `${(toneOffset * safeLevel * 2).toFixed(2)}deg`);
    this.element.style.setProperty("--halo-border-width", `${(2 + safeLevel * 2.8).toFixed(2)}px`);
    this.element.style.setProperty("--halo-glow", `${(10 + safeLevel * 24).toFixed(2)}px`);
  }

  stop() {
    this.generation += 1;
    if (this.frame !== null) this.cancelFrame(this.frame);
    this.frame = null;
    try { this.source?.disconnect(); } catch {}
    try { this.analyser?.disconnect(); } catch {}
    try { this.context?.close?.(); } catch {}
    this.source = null;
    this.analyser = null;
    this.context = null;
    this.timeDomain = null;
    this.frequencyDomain = null;
    this.level = 0;
    this.tone = 0.5;
    this.paint(0, 0.5);
  }

  dispose() {
    this.stop();
  }
}

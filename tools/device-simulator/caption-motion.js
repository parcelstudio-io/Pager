export const DEFAULT_CAPTION_SPEED_PX_PER_SECOND = 60;
export const DEFAULT_MAX_FRAME_DELTA_MS = 250;

export function captionOffset(contentWidth, viewportWidth) {
  const content = Number.isFinite(contentWidth) ? Math.max(0, contentWidth) : 0;
  const viewport = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
  return Math.max(0, content - viewport);
}

export function advanceCaptionOffset(
  currentOffset,
  targetOffset,
  elapsedMs,
  speedPxPerSecond = DEFAULT_CAPTION_SPEED_PX_PER_SECOND,
  maxFrameDeltaMs = DEFAULT_MAX_FRAME_DELTA_MS,
) {
  const current = Number.isFinite(currentOffset) ? Math.max(0, currentOffset) : 0;
  const target = Number.isFinite(targetOffset) ? Math.max(0, targetOffset) : 0;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const speed = Number.isFinite(speedPxPerSecond) && speedPxPerSecond > 0
    ? speedPxPerSecond
    : DEFAULT_CAPTION_SPEED_PX_PER_SECOND;
  const frameLimit = Number.isFinite(maxFrameDeltaMs) && maxFrameDeltaMs >= 0
    ? maxFrameDeltaMs
    : DEFAULT_MAX_FRAME_DELTA_MS;
  // Treat a long suspension as a pause. Catching up after a background-tab
  // stall would create a visible jump instead of a constant rendered pace.
  const frameElapsed = elapsed <= frameLimit ? elapsed : 0;
  const travel = speed * frameElapsed / 1000;

  if (target <= current) return target;
  return Math.min(target, current + travel);
}

export class CaptionMotion {
  constructor({
    caption,
    viewport,
    placeholder = "Captions appear here",
    speedPxPerSecond = DEFAULT_CAPTION_SPEED_PX_PER_SECOND,
    maxFrameDeltaMs = DEFAULT_MAX_FRAME_DELTA_MS,
    reducedMotion = () => globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false,
    resizeObserverFactory = (callback) => {
      if (!globalThis.ResizeObserver) return null;
      return new globalThis.ResizeObserver(callback);
    },
    requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
    cancelFrame = (handle) => globalThis.cancelAnimationFrame(handle),
  }) {
    this.caption = caption;
    this.viewport = viewport;
    this.placeholder = placeholder;
    this.speedPxPerSecond = speedPxPerSecond;
    this.maxFrameDeltaMs = maxFrameDeltaMs;
    this.reducedMotion = typeof reducedMotion === "function"
      ? reducedMotion
      : () => Boolean(reducedMotion);
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.frame = null;
    this.generation = 0;
    this.currentOffset = 0;
    this.targetOffset = 0;
    this.lastTimestamp = null;
    this.needsMeasure = false;
    this.hasCaption = false;
    this.resizeObserver = resizeObserverFactory?.(() => this.remeasure()) ?? null;
    this.resizeObserver?.observe(this.viewport);
  }

  render(text) {
    const hasCaption = Boolean(text);
    this.caption.textContent = hasCaption ? text : this.placeholder;
    this.caption.classList.toggle("caption-empty", !hasCaption);
    this.caption.dataset.motion = hasCaption ? "active" : "idle";
    this.hasCaption = hasCaption;

    if (!hasCaption) {
      this.resetMotion();
      return;
    }

    this.needsMeasure = true;
    this.ensureFrame();
  }

  ensureFrame() {
    if (this.frame !== null) return;

    const generation = this.generation;
    this.frame = this.requestFrame((timestamp) => {
      if (generation !== this.generation) return;
      this.frame = null;
      this.onFrame(timestamp);
    });
  }

  onFrame(timestamp) {
    if (this.needsMeasure) {
      const measuredTarget = captionOffset(
        this.caption.scrollWidth,
        this.viewport.clientWidth,
      );
      this.targetOffset = measuredTarget;
      this.needsMeasure = false;

      if (this.currentOffset > this.targetOffset) {
        this.currentOffset = this.targetOffset;
        this.lastTimestamp = null;
        this.applyOffset();
      }
    }

    if (this.reducedMotion()) {
      this.currentOffset = this.targetOffset;
      this.lastTimestamp = null;
      this.applyOffset();
      return;
    }

    if (this.currentOffset >= this.targetOffset) {
      this.currentOffset = this.targetOffset;
      this.lastTimestamp = null;
      this.applyOffset();
      return;
    }

    if (this.lastTimestamp === null || !Number.isFinite(timestamp)) {
      this.lastTimestamp = Number.isFinite(timestamp) ? timestamp : null;
    } else {
      this.currentOffset = advanceCaptionOffset(
        this.currentOffset,
        this.targetOffset,
        timestamp - this.lastTimestamp,
        this.speedPxPerSecond,
        this.maxFrameDeltaMs,
      );
      this.lastTimestamp = timestamp;
      this.applyOffset();
    }

    if (this.currentOffset < this.targetOffset) {
      this.ensureFrame();
    } else {
      this.lastTimestamp = null;
    }
  }

  applyOffset() {
    const roundedOffset = Number(this.currentOffset.toFixed(3));
    this.caption.style.setProperty(
      "--caption-offset",
      roundedOffset === 0 ? "0px" : `-${roundedOffset}px`,
    );
  }

  freeze() {
    this.generation += 1;
    this.cancelPendingFrame();
    this.targetOffset = Math.min(
      this.currentOffset,
      captionOffset(this.caption.scrollWidth, this.viewport.clientWidth),
    );
    this.currentOffset = this.targetOffset;
    this.lastTimestamp = null;
    this.needsMeasure = false;
    this.hasCaption = false;
    this.applyOffset();
  }

  remeasure() {
    if (!this.hasCaption) return;
    this.needsMeasure = true;
    this.ensureFrame();
  }

  resetMotion() {
    this.generation += 1;
    this.cancelPendingFrame();
    this.currentOffset = 0;
    this.targetOffset = 0;
    this.lastTimestamp = null;
    this.needsMeasure = false;
    this.hasCaption = false;
    this.applyOffset();
  }

  cancelPendingFrame() {
    if (this.frame === null) return;
    this.cancelFrame(this.frame);
    this.frame = null;
  }

  dispose() {
    this.generation += 1;
    this.cancelPendingFrame();
    this.lastTimestamp = null;
    this.needsMeasure = false;
    this.hasCaption = false;
    this.resizeObserver?.disconnect();
  }
}

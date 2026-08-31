export function captionOffset(contentWidth, viewportWidth) {
  const content = Number.isFinite(contentWidth) ? Math.max(0, contentWidth) : 0;
  const viewport = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
  return Math.max(0, content - viewport);
}

export class CaptionMotion {
  constructor({
    caption,
    viewport,
    placeholder = "Captions appear here",
    requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
    cancelFrame = (handle) => globalThis.cancelAnimationFrame(handle),
  }) {
    this.caption = caption;
    this.viewport = viewport;
    this.placeholder = placeholder;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.frame = null;
  }

  render(text) {
    this.cancelPendingFrame();

    const hasCaption = Boolean(text);
    this.caption.textContent = hasCaption ? text : this.placeholder;
    this.caption.classList.toggle("caption-empty", !hasCaption);
    this.caption.dataset.motion = hasCaption ? "active" : "idle";

    if (!hasCaption) {
      this.caption.style.setProperty("--caption-offset", "0px");
      return;
    }

    this.frame = this.requestFrame(() => {
      this.frame = null;
      const offset = captionOffset(
        this.caption.scrollWidth,
        this.viewport.clientWidth,
      );
      this.caption.style.setProperty(
        "--caption-offset",
        offset === 0 ? "0px" : `-${offset}px`,
      );
    });
  }

  cancelPendingFrame() {
    if (this.frame === null) return;
    this.cancelFrame(this.frame);
    this.frame = null;
  }

  dispose() {
    this.cancelPendingFrame();
  }
}

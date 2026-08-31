const DEFAULT_MAX_CHARACTERS = Number.POSITIVE_INFINITY;

export function boundCaption(text, maxCharacters = DEFAULT_MAX_CHARACTERS) {
  if (text.length <= maxCharacters) return text;

  const start = text.length - maxCharacters;
  const tail = text.slice(start);
  if (/\s/.test(text[start - 1])) return tail.trimStart();

  const firstSpace = tail.search(/\s/);
  return firstSpace >= 0 ? tail.slice(firstSpace).trimStart() : tail;
}

function captionPieces(delta) {
  return delta.match(/\S+\s*|\s+/g) || [];
}

export class CaptionPacer {
  constructor({
    onUpdate = () => {},
    intervalMs = 280,
    maxCharacters = DEFAULT_MAX_CHARACTERS,
    autoStart = true,
  } = {}) {
    this.onUpdate = onUpdate;
    this.intervalMs = intervalMs;
    this.maxCharacters = maxCharacters;
    this.autoStart = autoStart;
    this.activeResponseId = null;
    this.blockedResponseIds = new Set();
    this.pending = [];
    this.visible = "";
    this.playbackStarted = false;
    this.timer = null;
  }

  begin(responseId) {
    if (!responseId) return;
    this.stopTimer();
    this.activeResponseId = responseId;
    this.pending = [];
    this.visible = "";
    this.playbackStarted = false;
    this.onUpdate(this.visible);
  }

  push(responseId, delta) {
    if (!responseId || !delta || this.blockedResponseIds.has(responseId)) return;
    if (this.activeResponseId !== responseId) return;

    this.pending.push(...captionPieces(delta));
    if (this.autoStart && this.playbackStarted) this.startTimer();
  }

  start(responseId = this.activeResponseId) {
    responseId ||= this.activeResponseId;
    if (!responseId || this.blockedResponseIds.has(responseId)) return;
    if (this.activeResponseId !== responseId) return;
    this.playbackStarted = true;
    if (this.autoStart) this.startTimer();
  }

  tick() {
    const piece = this.pending.shift();
    if (piece === undefined) {
      this.stopTimer();
      return false;
    }

    this.visible = boundCaption(
      `${this.visible}${piece}`,
      this.maxCharacters,
    );
    this.onUpdate(this.visible);
    if (this.pending.length === 0) this.stopTimer();
    return true;
  }

  interrupt(responseId = this.activeResponseId) {
    if (!responseId || this.blockedResponseIds.has(responseId)) return;
    this.blockedResponseIds.add(responseId);
    if (responseId !== this.activeResponseId) return;

    this.pending = [];
    this.visible = this.visible.trimEnd();
    this.playbackStarted = false;
    this.stopTimer();
    this.onUpdate(this.visible);
  }

  flush(responseId = this.activeResponseId) {
    responseId ||= this.activeResponseId;
    if (responseId !== this.activeResponseId || this.blockedResponseIds.has(responseId)) return;
    this.stopTimer();
    if (this.pending.length > 0) {
      this.visible = boundCaption(
        `${this.visible}${this.pending.join("")}`,
        this.maxCharacters,
      );
      this.pending = [];
      this.onUpdate(this.visible);
    }
    this.playbackStarted = false;
  }

  reset() {
    this.stopTimer();
    this.activeResponseId = null;
    this.blockedResponseIds.clear();
    this.pending = [];
    this.visible = "";
    this.playbackStarted = false;
    this.onUpdate(this.visible);
  }

  startTimer() {
    if (this.timer !== null || this.pending.length === 0) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stopTimer() {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stopTimer();
  }
}

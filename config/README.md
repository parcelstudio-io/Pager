# Mochi configuration

`pager-expression.js` is the canonical allowlist shared by the trusted prompt
renderer, the Realtime function schema, and the browser expression controller.
Changing an emotion or eye-movement name therefore requires one edit rather
than three drifting copies.

The 4,000 ms interval applies only to large semantic gestures selected by the
model. Human eyes make much faster saccades and fixational movements, but
rendering screen-wide robot gestures at that biological rate looks agitated.
Mochi's local CSS animation supplies continuous low-amplitude life; the model
plan adds a large gesture at most every four seconds, with each gesture returning
to the locally selected resting gaze before the next one.

Research context:

- Natural-scene eye tracking shows that fixation timing varies with visual
  selection rather than following one fixed cadence:
  https://pubmed.ncbi.nlm.nih.gov/27627736/
- Conversational gaze varies with speaking, listening, and noise rather than
  following a metronome: https://pmc.ncbi.nlm.nih.gov/articles/PMC6639257/

The interval is consequently a product-design inference and should be tuned by
recorded user testing, not presented as a biological constant.

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

- Human eye movements use short fixations and rapid saccades; see Rayner's
  review: https://pubmed.ncbi.nlm.nih.gov/9849112/
- Conversational gaze varies with speaking, listening, and noise rather than
  following a metronome: https://pmc.ncbi.nlm.nih.gov/articles/PMC6639257/

The interval is consequently a product-design inference and should be tuned by
recorded user testing, not presented as a biological constant.

# Human eye motion translated into Mochi animation

## Purpose

This note records the biological observations behind Mochi's stylized browser face. It is not a clinical eye model. The goal is to avoid motion that reads as a continuously orbiting icon while keeping the character legible on a small display.

## Findings used

1. Human gaze is dominated by **fixations** separated by **saccades**. Fixations are relatively stable at visible scale. Saccades are fast, brief movements that shift both eyes toward a new target, typically over tens of milliseconds rather than a slow glide.
2. The two eyes normally make largely conjugate saccades: they move in the same direction at nearly the same time. Independent wandering reads as loss of binocular coordination, not ordinary curiosity.
3. Smooth pursuit is used to follow a moving visual target. Without such a target, an exploratory scan is better represented as saccade, fixation, corrective saccade, and another fixation.
4. Tiny drift, tremor, and microsaccades occur during fixation, but faithfully scaling those movements to Mochi's low-resolution eyes would exaggerate them into visible jitter. Large pupil gaze therefore uses stable fixations; a separate one-to-four-pixel outer-eye “alive” motion supplies continuous character without pretending to be a visible microsaccade.
5. The eyeball does not squash when gaze changes. The visible aperture between the eyelids changes: the upper lid accompanies vertical saccades and downward gaze narrows and lowers the visible opening.

## Animation translation

- Idle gestures retain random 3–5 second startup and 6–12 second repeat delays.
- Each large pupil displacement happens within approximately 50–100 milliseconds, followed by a longer hold. The outer ivory apertures follow in the same direction with a deliberately exaggerated head-like shift.
- Look-up and look-down gestures use one main saccade, a small corrective saccade, another fixation, and a rapid return to center.
- Look-around and eye-roll gestures are scan paths made from discrete fixation points. A “roll” is intentionally a sequence of saccades around the perimeter, not a continuously interpolated circle.
- Thinking performs one short scan and then holds its final fixation. It does not sweep left and right forever.
- Speaking and simultaneous speaking/listening change the static eye pose but do not rhythmically bob the entire eye rig.
- Dark pupils carry precise gaze inside deformable ivory apertures. Both pupils translate together, while aperture width, height, tilt, spacing, and controlled asymmetry carry expression.
- The outer apertures also shift toward the target, including all four room-like corners. This is a deliberate non-anatomical abstraction that reads like a tiny head turn on a face made only from eyes; it is not a claim that human eye openings slide around the face.
- Both pupils share the same saccade timing and direction. Emotion may make the outer shapes asymmetric, but random gaze does not make the pupils wander independently.
- A persistent low-amplitude layer changes rhythm by emotion: buoyant for positive affect, widened and faster for alert affect, slow/downward for sad or sleepy affect, and restrained for focus. It is character motion, not biological gaze.
- Reduced-motion preference disables these animations.

The timings are animation choices informed by physiology, not a claim that the display reproduces exact eye angles or muscle dynamics.

## Primary references

- Krauzlis, Goffart, and Hafed, [Neuronal control of fixation and fixational eye movements](https://pubmed.ncbi.nlm.nih.gov/28242738/) — distinguishes brief saccades, relatively stable fixation, miniature fixational movement, and smooth pursuit.
- Otero-Millan and colleagues, [Fixational eye movements and binocular vision](https://pubmed.ncbi.nlm.nih.gov/25071480/) — reviews conjugate microsaccades and binocular coordination.
- Baloh and colleagues, [Quantitative measurement of saccade amplitude, duration, and velocity](https://pubmed.ncbi.nlm.nih.gov/1237825/) — documents the amplitude/duration and amplitude/velocity relationships of human saccades.
- Guitton, Simard, and Codère, [Upper eyelid movements measured with a search coil during blinks and vertical saccades](https://pubmed.ncbi.nlm.nih.gov/1748560/) — measures eyelid movement accompanying vertical gaze shifts.

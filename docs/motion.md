# Motion spec

Timings, easings and the order of events, so the renderer (Three.js, JS springs) and the UI (CSS transitions) agree. Values live in `packages/ui/src/tokens.css` and `tokens.ts`; this file says when each one is used.

## Tokens

| Token         | Value                                                  | Used for                                                                       |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `hover`       | 80 ms, `ease-out`                                      | Plane highlight, row hover, tooltip appear                                     |
| `pane`        | 200 ms, `ease-in-out`                                  | Tools and info panes sliding open or collapsed; the viewport resizing to match |
| `shrink`      | 400 ms, `ease-lift`                                    | The page scaling down into the viewport window                                 |
| `lift`        | 600 ms, spring `{ stiffness 170, damping 20, mass 1 }` | Planes exploding apart; the explode slider when released                       |
| `ease-out`    | `cubic-bezier(0.2, 0, 0, 1)`                           | Things appearing                                                               |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)`                         | Things moving between two resting places                                       |
| `ease-lift`   | `cubic-bezier(0.34, 1.3, 0.64, 1)`                     | The CSS twin of the lift spring: about 4% overshoot, one settle                |
| `ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)`                       | Closing; decelerates without overshoot                                         |

Under `prefers-reduced-motion: reduce` every duration is 0 and the open and close sequences become the crossfade in §4.

## 1. Opening

Trigger: toolbar click, Alt+Shift+S, or the bookmarklet. Times count from the moment the stage host is appended; capture and the photos happen before that.

| t          | Event                                                                                                                                                                                                                                                                              | Owner         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| before     | `capture()` runs on the live page. If it fails, a one‑line note appears in the corner and nothing else happens.                                                                                                                                                                    | core          |
| before     | The content script photographs the page one screen at a time with `captureVisibleTab` (up to 6 screens, progress on the toolbar badge) and scrolls back. If a capture is refused, the stage opens with the photos it has, or with plain planes.                                    | extension     |
| 0          | The stage host is appended. The backdrop fades from transparent to `--sr-cream` over 150 ms `ease-out`. Both panes are already in their remembered state but have `opacity: 0`.                                                                                                    | ui            |
| 50 ms      | **Stage one, shrink.** The viewport window starts at the full tab rect with no border and the screenshot filling it at explode 0. It animates `transform` (scale + translate) to its laid‑out rect over 400 ms `ease-lift`. The title bar and border fade in over the last 150 ms. | ui + renderer |
| 450 ms     | Panes fade in over 150 ms `ease-out`.                                                                                                                                                                                                                                              | ui            |
| 450 ms     | **Stage two, lift.** The camera tilts from top‑down to the home orbit (about 35° pitch, 20° yaw) over 600 ms `ease-settle`, while every plane springs from z 0 to its layout z on the lift spring. Planes start together; no stagger (10 000 staggered planes look like noise).    | renderer      |
| ≈ 1 100 ms | Settled. Keyboard focus moves to the viewport. The tooltip is allowed from here.                                                                                                                                                                                                   | ui            |

Stage two starts when stage one ends, not before: the eye should see "the page became a window" and then "the window became layers".

## 2. Closing

Trigger: Esc, the red dot, or the toolbar click.

| t      | Event                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Panes and tooltip fade out over 100 ms. Keyboard focus returns to the element that had it before opening, if it still exists.             |
| 0      | **Lift reversed.** Planes return to z 0 on the lift spring; the camera returns to top‑down over 400 ms `ease-settle`.                     |
| 400 ms | **Shrink reversed.** The viewport window scales back to the full tab rect over 300 ms `ease-settle` as its border and title bar fade out. |
| 700 ms | The backdrop fades out over 100 ms. The stage host is removed. Only the font `<style>` stays in the document.                             |

Closing is faster than opening on purpose. The user has decided; do not make them watch.

## 3. While open

| Interaction                | Motion                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hover a plane              | Fill goes from `plane-fill` to `plane-fill-hover` over 80 ms; the tooltip appears after 80 ms and follows the cursor with no lag. Leaving reverses over 80 ms.                                          |
| Select a plane             | The selected plane's edge turns `plane-selected` immediately; the previously selected one fades out over 80 ms. The inspector content swaps with no animation.                                          |
| Explode slider             | While dragging, planes follow the value every frame with no easing. On release, nothing moves (they are already there). Keyboard arrows step 2% and animate on the lift spring.                         |
| Depth cutoff               | Planes beyond the cutoff fade out over 80 ms; planes coming back fade in over 80 ms. No position change.                                                                                                |
| Color mode                 | Colors crossfade over 120 ms `ease-in-out`.                                                                                                                                                             |
| Collapse a pane            | The pane's content fades over 100 ms, then the pane width (or height) animates to the 20px tab over 200 ms `ease-in-out`. The viewport window resizes in the same transition. Opening is the mirror.    |
| Resize by dragging the gap | No easing; the layout follows the pointer every frame.                                                                                                                                                  |
| Live mode re‑layout        | New planes appear at their layout position with a 120 ms fade. Moved planes animate position over 200 ms `ease-in-out`. Removed planes fade out over 120 ms. Never re‑run the lift.                     |
| Tour                       | Camera orbits at 6° per second, slowing to 0 over 600 ms when the user touches anything.                                                                                                                |
| Two‑pick ("Why behind?")   | The first pick gets the accent edge; the second gets it too, and the chain lines draw from each to the shared ancestor over 300 ms `ease-out`. The verdict card slides up 8px and fades in over 150 ms. |

## 4. Reduced motion

- The backdrop and the viewport window fade in together over 200 ms. No scale, no tilt.
- Planes appear directly at their layout z; the camera starts at the home orbit.
- Closing fades everything out over 150 ms.
- Panes toggle with no animation. Hover and selection changes are instant.
- The tour still orbits (it is user‑triggered and continuous) but at half speed.

## 5. Rules

- Nothing animates that the user did not cause, except the opening sequence itself.
- One spring, one overshoot. The lift is the only thing that overshoots; everything else settles.
- Position changes animate; content changes do not. Text never slides.
- The page under the stage never moves. It is a screenshot in a plane.

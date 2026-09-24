# Frutinovela Workflow

## Goal

Create a comedic vertical AI novela with fruit/caricature characters and production-grade continuity.

## Visual Rules

- Make characters fruits first, software metaphors second.
- Do not use a narrator by default; scenes should be understandable through dialogue, acting, reaction shots, props, and editing.
- Use framework logos only as color/symbol inspiration, not literal logos.
- Keep a canon reference image per character in `videos/<slug>/visual/characters/`.
- Record model, prompt, seed, and output path for every generated character image.
- Reject realistic corporate headshots; the target is frutinovela caricature.

## Scene Rules

Each scene should include:

- `scene.md`: purpose, emotional beat, duration target.
- `dialogue-elevenlabs.md`: speaker-separated character dialogue; no narrator unless explicitly requested.
- `shotlist.md`: vertical shots.
- `image-prompts.md`: still/reference prompts.
- `video-prompts.md`: fal video prompts using approved references.
- `continuity.md`: what must stay stable.
- `review.md`: human approval status.

## Remotion

- One render unit per scene.
- Default composition: `1080x1920`, `30fps`.
- Render output: `videos/<slug>/scenes/<scene-id>/renders/<scene-id>.vertical.mp4`.
- Keep generated audio and video assets under `scenes/<scene-id>/assets/`.

## Supervision

Never rely only on chat output. Every generated decision should land in a file that can be reviewed, approved, rejected, or superseded.

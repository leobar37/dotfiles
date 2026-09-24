---
name: frutinovela-production
description: Produce supervised vertical AI fruit soap operas with anthropomorphic fruit characters, fal.ai visual prompts, ElevenLabs Voice Design previews, scene-by-scene continuity, and Remotion renders. Use when creating or maintaining frutinovelas, novela IA projects, caricature fruit characters, ElevenLabs voices, fal prompts, vertical scene packages, or Remotion-per-scene workflows.
---

# Frutinovela Production

Use this skill to build vertical AI soap operas where the main characters are comedic anthropomorphic fruits. The workflow is production-first: character references, voice previews, scene artifacts, and renders are all saved as inspectable files before final approval. Do not add a narrator by default; tell the story through character dialogue and performance.

## Core Workflow

1. Create or open a project workspace with `.pi-project/` as the supervision state.
2. Define story rules in `story/`, visual rules in `visual/`, and per-scene work in `scenes/<scene-id>/`.
3. Generate fruit character references first; do not proceed to video prompts without approved references.
4. Generate ElevenLabs Voice Design previews; never save a permanent voice automatically.
5. For each scene, create dialogue-only character exchanges, voice directions, image prompts, video prompts, continuity checks, and a vertical Remotion render unit.
6. Approve or retry scene artifacts before composing episodes.

## Defaults

- Format: vertical `1080x1920`, `30fps`.
- Visual style: high-end 3D animated caricature, fruit-drama, telenovela lighting, exaggerated emotion.
- Image model default: `fal-ai/flux-2-pro`; use `fal-ai/flux-2-max` for higher-quality character regeneration.
- Dialogue video strategy: use Seedance native audio/video first for short dialogue clips. Generate voice, room tone, performance, and lip movement together instead of forcing external voice onto video.
- Voice strategy: ElevenLabs Voice Design is an alternative when a project needs controlled canon voices; do not use it as the default for early dialogue-video iteration.
- Storytelling strategy: no narrator unless the user explicitly asks for one.
- Do not store API keys in `.pi-project`.

## Seedance Native-Audio Scene Standard

Use this standard for supervised dialogue clips:

1. Generate short clips, usually `8s`, with `bytedance/seedance-2.0/fast/reference-to-video`, `720p`, `9:16`, and `generate_audio: true`.
2. Use the previous clip's last frame as the continuity anchor for the next clip.
3. Use character reference images only for identity, not for composition or new staging.
4. Write long production prompts, not short descriptions. Include reference roles, continuity lock, set lock, camera rules, timing, dialogue, performance, audio rules, and hard constraints.
5. Prefer one primary spoken intervention per 8-second clip. Other characters should react silently unless the clip is explicitly a two-line exchange.
6. Avoid words like `cut`, `reframe`, `transition`, or `beat` unless a visible edit is intended.
7. Keep generated subtitles out of the model. If subtitles are needed, add them later as a Remotion layer.

Each approved clip should produce:

- final video,
- first and last frame,
- `continuity.json`,
- `probe.json`,
- `contact-sheet.jpg`,
- `timestamp-sheet.jpg`,
- a `.pi-project/scenes/<scene-id>/<test-id>.json` report.

Cost rule: iterate in Seedance fast `720p`; upscale or regenerate at higher quality only after a clip is approved.

## Project Pattern

Use this structure when the repo has no stronger convention:

```text
.pi-project/
├── story/
├── visual/
├── audio/voices.json
├── scenes/<scene-id>/
└── outputs/

videos/<slug>/
├── visual/characters/
├── audio/voices/
└── scenes/<scene-id>/
    ├── assets/audio/
    ├── remotion/
    └── renders/
```

## References

- Read `references/frutinovela-workflow.md` for the full production workflow.
- Read `references/voice-design.md` when creating or selecting ElevenLabs voices.
- Use scripts in `scripts/` as templates for project-local automation.

---
name: videos-youtube-render-qa
description: Diagnose, QA, and correct renders for /Users/leobar37/code/videos-youtube using Remotion, FFmpeg, transcripts, topics, and YouTube-ready outputs. Use when asked to fix video edits that cut voice, audit transitions, migrate the loop_final_v4 continuous-overlay pattern to the 30-minute video, inspect transcript/topic alignment, or prepare a corrected render before upload.
---

# Videos YouTube Render QA

Use this skill for the `videos-youtube` project when the task involves render quality, topic segmentation, Remotion overlays, FFmpeg assembly, or preparing corrected YouTube video files.

## Workflow

1. Ground the target video.
   - Confirm whether the target is the loop video or the 30-minute video.
   - Inspect the source MP4, current output, transcript, topics, and package scripts before proposing edits.
   - Treat `/Users/leobar37/code/videos-youtube` as the project root.

2. Audit transcript/topic boundaries.
   - Use transcript segments as the truth source for speech continuity.
   - Flag any topic boundary that lands inside a spoken segment or too close to active voice.
   - Prefer moving boundaries to real pauses over adding visual transitions.

3. Preserve voice continuity.
   - Do not use full-screen transition cards between topics unless the user explicitly asks for them.
   - Use topics to drive subtle lower-third/topic badges or overlays.
   - Keep the body video continuous whenever possible; avoid splitting audio into topic chunks if it risks truncation.

4. QA before final render.
   - Run the transition QA script or adapt it for the chosen topics file.
   - Require zero `voiceCutoffFailures` before treating a render as upload-ready.
   - Inspect frames/audio around previously suspicious boundaries.

5. Render and verify.
   - Render badges/overlays first, then assemble with FFmpeg.
   - Verify output with `ffprobe`: duration, 1920x1080, video codec, and audio codec.
   - Keep old uploads untouched; if YouTube already has a defective version, upload the corrected video as a new video.

## Per-Video Project Pipeline (preferred for new videos)

For a NEW video (especially multi-clip, or when richer animation is wanted), use the
per-video pattern: each video lives in `videos/<slug>/` with its OWN self-contained
Remotion project and local `scripts/`. Read `references/per-video-remotion-pipeline.md`
before starting. Key points:

- Hybrid: FFmpeg builds a continuous `body_clean.mp4` (fillers/pauses cut), then Remotion
  layers intro + lower-thirds + progress bar + transitions on top. Do not do micro-cutting
  inside Remotion.
- Filler/pause cleaning is anchored to REAL audio silence (`silencedetect`), never to
  Whisper word timestamps (Whisper drops disfluencies and its word times are imprecise).
  Only trim excess of long pauses; only cut fillers (`este`, `o sea`) if both edges snap to
  silence. Validate zero cut edges land in voice before rendering. Test a `--sample` first.
- `remotion/public/body.mp4` must be a real copy, not a symlink (Remotion won't follow
  symlinks when bundling `public`).
- Reference implementation: `videos/video-fable/` (see its `README.md`).

## Project Reference

Read `references/videos-youtube-render.md` before changing the legacy loop/30-min render
pipeline. Read `references/per-video-remotion-pipeline.md` for the per-video workflow.

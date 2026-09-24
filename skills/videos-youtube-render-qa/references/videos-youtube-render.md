# Videos YouTube Render Notes

## Project

- Root: `/Users/leobar37/code/videos-youtube`
- Runtime: Bun, FFmpeg, Remotion.
- Current corrected loop output: `out/loop_final_v4.mp4`.
- Current long render to audit next: `out/0620_final_v3.mp4`.
- YouTube cannot replace a video file while keeping the same URL, so corrected uploads must be new videos.

## What Went Wrong In The Loop Render

- `edit-v3.ts` split the video by `assets/topics.json` and inserted 5-second full-screen transition cards.
- Several topic boundaries landed during speech or before the semantic topic actually changed.
- The visual transition text was misleading in places and cut the user's voice.
- The fix was not to make prettier transitions; it was to remove hard transitions from the body and preserve continuous audio.

## V4 Pattern To Reuse

- Use `assets/topics_v4.json` for corrected semantic boundaries.
- Use `src/scripts/qa-transitions.ts` to detect voice cutoffs and stale transition assets.
- Use `src/scripts/render-scenes-v4.ts` to render subtle topic badges as alpha `.mov` overlays.
- Use `src/scripts/edit-v4.ts` to assemble one continuous body from `assets/concat.mp4` with badges and concept overlays.
- Keep intro separate if needed, but do not insert topic transition clips into the body.

## Rules For The 30-Minute Video

- Start from current long assets and transcript scenes, not from the loop topics blindly.
- Audit `out/0620_final_v3.mp4` against transcripts before deciding what to render.
- If the long video still uses full-screen transition cards, replace them with the continuous-overlay pattern.
- Do not reuse `assets/transitions/topic_*.mp4` unless the user explicitly requests full-screen cards.
- If a topic badge is useful, make it short, lower-third, and nonblocking.
- Do not let visual labels invent concepts that the user did not actually emphasize.

## QA Checklist

- `voiceCutoffFailures` must be `0`.
- Warnings are acceptable only after reviewing the nearby transcript evidence.
- Verify all old problem areas manually when known.
- Use `ffprobe` to confirm output has 1920x1080 video and audio.
- Confirm output duration matches the expected source duration plus any intentional intro.
- Do not upload until the corrected file is visually and audibly checked around boundary points.

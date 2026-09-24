---
name: youtube-linkedin-launch
description: Optimize and launch a YouTube video, then create the matching LinkedIn post in the user's voice. Use when asked to research a YouTube topic, improve title/description/tags, publish or verify a YouTube Studio video with the real browser, inspect recent LinkedIn posts for voice, draft or publish a LinkedIn post, or coordinate a YouTube-to-LinkedIn launch.
---

# YouTube LinkedIn Launch

## Workflow

Use the user's real browser session for YouTube Studio and LinkedIn. Prefer authenticated real-browser tooling or Computer Use over hidden/new browsers when the user asks to use their existing session.

1. Ground the video.
   - Read local metadata/transcripts if available.
   - Verify the target video ID, current visibility, title, description, tags, thumbnail, duration, and YouTube checks.
   - Stop if the video is not the intended target.

2. Research the launch angle.
   - Check current official/platform sources when recommendations may have changed.
   - Treat YouTube tags as secondary. Optimize title, thumbnail, first description lines, chapters, and visible hashtags first.
   - Use tags mainly for alternate spellings, Spanish/English variants, tool names, and ambiguous terms.

3. Optimize YouTube metadata.
   - Keep the promise specific and searchable.
   - Put the main topic in the title and first description paragraph.
   - Keep visible hashtags few and relevant.
   - Do not invent links, sponsors, or claims not supported by the video.
   - See `references/youtube-launch.md` before changing visibility.

4. Publish or save.
   - Before changing visibility, confirm copyright and community checks show no problems.
   - If warnings, restrictions, copyright claims, or policy messages appear, stop and report the exact message.
   - Only publish if the user explicitly requested public visibility.
   - Verify the final Studio state and, when public, open the public video link.

5. Prepare LinkedIn.
   - Read the user's recent posts before drafting unless a current voice profile is already loaded.
   - Use `references/voice-profile.md` as the default voice guide.
   - Keep the post natural, practical, first-person, and low on generic hype.
   - Include the YouTube link when the user asked to reference the video.

6. Publish LinkedIn.
   - Use a dedicated browser automation session.
   - Fill the post composer, verify the exact text and link, then publish only if the user requested publication.
   - Confirm the post appears in the feed or recent activity.

## Browser Automation Notes

- Confirm the browser automation connection is healthy before acting.
- Use isolated sessions, for example `youtube-launch` and `linkedin-launch`.
- Prefer `snapshot` refs for clicking/filling. Use `evaluate` only when refs are missing or unstable.
- Close temporary sessions at the end.

## References

- `references/voice-profile.md`: user voice and LinkedIn style.
- `references/youtube-launch.md`: YouTube launch checklist and metadata rules.
- `references/videos-youtube-launch.md`: project-specific launch lessons for `/Users/leobar37/code/videos-youtube`.

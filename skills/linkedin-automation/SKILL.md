---
name: linkedin-automation
description: Automate LinkedIn interactions through the user's authenticated browser session. Use when the user wants to create, verify, or publish LinkedIn posts, react to posts, comment on LinkedIn, search the feed, or operate LinkedIn with the real browser.
---

# LinkedIn Automation

Control LinkedIn through the user's authenticated browser session. Use the available real-browser automation tooling, or use Computer Use when the user explicitly asks for direct computer interaction or when visual verification is important.

## Prerequisites

1. Confirm the user is logged into LinkedIn in the real browser.
2. Confirm the available browser automation tool is connected before making changes.
3. Use a dedicated session or tab group for LinkedIn work.

## Creating Posts

1. Open `https://www.linkedin.com/feed/`.
2. Click `Crear publicación`.
3. Fill the post editor with the final text.
4. Verify the visible text, link, visibility, and preview card.
5. Click `Publicar` only when the user has explicitly asked to publish.
6. Confirm the toast or recent feed item says the post was published.

## Spanish Publishing Safety

- When Computer Use strips accents or punctuation, put the final Spanish copy on the clipboard with `pbcopy`, paste into the composer, and re-read the modal before publishing.
- Verify that the post says what the source video/article actually says. Do not add jargon just because it exists in project files.
- If the user interrupts, corrects, or rejects the draft before publish, treat it as not published. Replace the draft and verify again.
- Confirm the final link and preview target before clicking `Publicar`.
- After publishing, capture the LinkedIn post URL from the confirmation toast or activity item.

## References

- `references/workflows.md`: quick browser workflow notes and fallbacks.

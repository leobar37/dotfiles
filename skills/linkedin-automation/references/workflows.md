# LinkedIn Browser Workflows

## Create A Post

- Open `https://www.linkedin.com/feed/`.
- Click `Crear publicación`.
- Fill the editor.
- Wait for link preview cards to load when a URL is included.
- Verify text, preview, and audience.
- Click `Publicar`.
- Confirm `Se ha publicado` or the new feed item.

## Fallbacks

- If direct typing loses accents, use `pbcopy` then paste.
- If a button lacks a stable ref in the browser automation layer, use Computer Use visual click or a scoped DOM evaluate fallback.
- If the composer remains open after clicking publish, wait and re-check before clicking again.

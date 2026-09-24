# ElevenLabs Voice Design for Frutinovelas

## Voice Selection Strategy

Use Voice Design previews first. Generate three previews per character, save the audio files, and let the human choose. Do not create a permanent voice until a preview is selected. Do not create a narrator voice unless the user explicitly requests narration.

## Prompt Format

Use a detailed description:

```text
Native <language/variant>. <Gender/sound>, <age range>. Studio quality.
Persona: <short role>. Emotion: <2-3 adjectives>.
<Timbre, pitch, pacing, delivery, comedic/dramatic intent>.
```

## Preview Text

Preview text should match the character emotion. Prefer 100-1000 characters when using the API. Include a line with pauses, sarcasm, and telenovela rhythm.

## Canon Manifest

Save voice state to both:

```text
.pi-project/audio/voices.json
videos/<slug>/audio/voices/voices.json
```

Each preview entry should include:

- `generated_voice_id`
- `character`
- `prompt`
- `text`
- `audioPath`
- `status`: `preview`, `selected`, `rejected`, or `saved`

Each saved voice should include:

- `voice_id`
- `voice_name`
- `voice_description`
- `selected_generated_voice_id`
- `status: "saved"`

---
name: remotion-setup
description: |
  Automates Remotion video project setup with React Three Fiber, Tailwind CSS, and proper configuration.
  Creates folder structure, installs dependencies, and generates base components.
  Use when starting new video projects or adding video capabilities to existing React apps.
  Keywords: remotion, video, setup, react-three-fiber, automation, typescript.
---

# Remotion Setup

Automated Remotion + React Three Fiber project configuration.

## Quick Start

```bash
# Default setup (includes Three.js, audio, Tailwind)
bun scripts/setup.sh

# Custom options
bun scripts/setup.sh --fps 60 --resolution 3840x2160

# Minimal 2D-only setup
bun scripts/setup.sh --without-three --without-audio
```

## What Gets Created

**Project Structure**:
```
src/
├── components/
│   ├── base/           # Reusable components
│   ├── compositions/   # Video scenes
│   └── ui/            # UI components
├── design-system/      # Styling system
├── hooks/             # Custom hooks
├── helpers/           # Utilities
└── utils/             # General utils
```

**Configuration Files**:
- `remotion.config.ts` - Remotion settings
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS (optional)
- `package.json` - Dependencies and scripts

**Scripts Added**:
- `dev` - Start Remotion studio
- `build` - Bundle for production
- `render` - Render MP4 videos
- `still` - Export still images
- `lint` - Code quality checks

## Setup Options

| Feature | Default | Command |
|---------|---------|---------|
| React Three Fiber | Included | `--without-three` to exclude |
| Audio Processing | Included | `--without-audio` to exclude |
| Tailwind CSS | Included | `--without-tailwind` to exclude |
| FPS | 30 | `--fps 60` |
| Resolution | 1920x1080 | `--resolution 3840x2160` |

## Integration Modes

**New Project**: Run in empty directory
**Existing Project**: Use `--incremental` flag
**Migration**: Use `--migrate` for v3→v4

## Detailed Guides

**Project Configuration** → See [reference/configuration.md](reference/configuration.md)
**Component Templates** → See [reference/components.md](reference/components.md)
**Custom Presets** → See [reference/presets.md](reference/presets.md)
**Agent Setup** → See [reference/agents.md](reference/agents.md)

## Common Patterns

### Custom Preset
Edit `scripts/config.json`:
```json
{
  "presets": {
    "social": {
      "includeThree": true,
      "defaultResolution": "1080x1080"
    }
  }
}
```

### Video Texture Usage
```tsx
import { useVideoTexture } from '../use-texture'
const texture = useVideoTexture('public/video.mp4')
```

## Help Commands

```bash
# Show all options
bun scripts/setup.sh --help

# List available presets
bun scripts/setup.sh --list-presets
```

## Troubleshooting

**Installation Issues**:
- Ensure Bun is installed
- Clear node_modules if conflicts occur

**Build Errors**:
- Check TypeScript strict mode
- Verify asset paths in public/

**Rendering Issues**:
- Use H.264 codec for videos
- Verify audio formats (MP3/WAV)

## Next Steps

1. Run `bun run dev` to start development
2. Open http://localhost:3000
3. Create compositions in `src/components/compositions/`
4. Reference `AGENTS.md` for specialized AI agents
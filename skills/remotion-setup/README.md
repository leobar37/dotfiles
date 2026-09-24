# Remotion Setup Skill

Claude Code skill for automatically setting up Remotion video projects with React Three Fiber integration.

## Quick Start

1. Load the skill:
   ```
   /skill remotion-setup
   ```

2. Run the setup script:
   ```bash
   ./scripts/setup.sh
   ```

3. Start development:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

## What It Does

Automatically configures a complete Remotion project with:
- ✅ All necessary dependencies
- ✅ Proper folder structure
- ✅ Configuration files
- ✅ Base components
- ✅ TypeScript setup
- ✅ ESLint & Prettier
- ✅ Tailwind CSS (optional)
- ✅ React Three Fiber (optional)
- ✅ Audio processing (optional)

## Usage Examples

### Standard Setup (YouTube videos)
```bash
./scripts/setup.sh
```

### Social Media Square Video
```bash
./scripts/setup.sh --resolution 1080x1080
```

### Minimal Setup (2D only)
```bash
./scripts/setup.sh --without-three --without-audio
```

### Adding to Existing Project
```bash
./scripts/setup.sh --incremental
```

## Folder Structure Created

```
src/
├── components/
│   ├── base/           # Reusable components
│   ├── compositions/   # Video scenes
│   └── ui/            # UI elements
├── design-system/      # Styling system
├── hooks/             # Custom hooks
├── helpers/           # Utilities
└── utils/             # General utils
```

## Customization

Modify `scripts/config.json` to:
- Add custom presets
- Change default settings
- Add extra dependencies
- Configure folder structure

## Features

### Presets
- `minimal` - Core Remotion only
- `standard` - Full featured setup
- `social-media` - Square videos
- `youtube` - Standard YouTube format
- `cinema` - 4K 60fps quality

### Scripts Included
- `dev` - Start Remotion studio
- `build` - Bundle for production
- `render` - Render MP4 videos
- `still` - Export still images
- `lint` - Code quality checks

### Components Created
- `Root.tsx` - Main composition container
- `ExampleScene.tsx` - Sample video scene
- `RoundedBox.tsx` - 3D rounded box (if Three.js enabled)
- `use-texture.ts` - Video texture hook (if Three.js enabled)

## Integration

### New Projects
Run the setup script in an empty directory to create a new project from scratch.

### Existing Projects
Use the `--incremental` flag to add Remotion capabilities to existing React projects.

### Migration
Use `--migrate` flag to upgrade from Remotion v3 to v4.

## Examples

See `examples.md` for:
- Code examples
- Common workflows
- Performance tips
- Troubleshooting

## Dependencies

### Core
- `remotion` - Video creation framework
- `@remotion/cli` - Command line tools
- `react` - UI framework
- `typescript` - Type safety

### Optional
- `@react-three/fiber` - 3D graphics
- `@remotion/media-utils` - Audio processing
- `@remotion/tailwind-v4` - Styling
- `@remotion/transitions` - Scene transitions

## Help

Run with `--help` for all options:
```bash
./scripts/setup.sh --help
```
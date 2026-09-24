# Project Presets Reference

## Available Presets

### Minimal
2D-only setup without 3D or audio:

```bash
bun scripts/setup.sh --without-three --without-audio --without-tailwind
```

**Features**:
- Core Remotion only
- Basic TypeScript
- No styling framework
- No 3D capabilities
- No audio processing

### Standard
Full-featured setup with all options (default):

```bash
bun scripts/setup.sh
```

**Features**:
- React Three Fiber
- Audio processing
- Tailwind CSS v4
- TypeScript
- All utilities

### Social Media
Optimized for square social content:

```bash
bun scripts/setup.sh --resolution 1080x1080 --fps 30
```

**Configuration**:
- 1080x1080 resolution
- 30 FPS
- Includes all features

### YouTube
Standard YouTube video format:

```bash
bun scripts/setup.sh --resolution 1920x1080 --fps 30
```

**Configuration**:
- 1920x1080 resolution
- 30 FPS
- Includes all features

### Cinema
4K high-quality production:

```bash
bun scripts/setup.sh --resolution 3840x2160 --fps 60
```

**Configuration**:
- 3840x2160 resolution
- 60 FPS
- Includes all features

### TikTok/Reels
Vertical video format:

```bash
bun scripts/setup.sh --resolution 1080x1920 --fps 30
```

**Configuration**:
- 1080x1920 resolution
- 30 FPS
- Mobile-optimized

## Custom Presets

### Creating Custom Presets

Edit `scripts/config.json`:

```json
{
  "presets": {
    "tutorial": {
      "includeThree": false,
      "includeAudio": true,
      "includeTailwind": true,
      "defaultResolution": "1280x720",
      "defaultFPS": 25,
      "description": "Optimized for tutorial videos"
    },
    "presentation": {
      "includeThree": true,
      "includeAudio": true,
      "includeTailwind": true,
      "defaultResolution": "1920x1080",
      "defaultFPS": 30,
      "description": "Corporate presentation style"
    },
    "instagram-story": {
      "includeThree": true,
      "includeAudio": true,
      "includeTailwind": true,
      "defaultResolution": "1080x1920",
      "defaultFPS": 30,
      "description": "Instagram Story format"
    }
  }
}
```

### Using Custom Presets

```bash
# Use custom preset
bun scripts/setup.sh --preset tutorial

# Override preset values
bun scripts/setup.sh --preset youtube --fps 60
```

## Preset Configuration Options

### Dependencies
- **includeThree**: Add React Three Fiber and Three.js
- **includeAudio**: Add @remotion/media-utils
- **includeTailwind**: Add Tailwind CSS v4

### Video Settings
- **defaultFPS**: Frames per second (recommended: 30, 60)
- **defaultResolution**: Width x Height (e.g., "1920x1080")
- **defaultDuration**: Default composition length in frames

### Features
- **includeTransitions**: Add @remotion/transitions
- **includeFonts**: Add @remotion/google-fonts
- **includeZod**: Add @remotion/zod-types
- **includeCLI**: Add additional CLI tools

## Industry Presets

### Film/TV Production
```json
{
  "film": {
    "includeThree": true,
    "includeAudio": true,
    "defaultResolution": "4096x2160",
    "defaultFPS": 24,
    "includeProRes": true
  }
}
```

### Broadcast
```json
{
  "broadcast": {
    "includeThree": false,
    "includeAudio": true,
    "defaultResolution": "1920x1080",
    "defaultFPS": 29.97,
    "includeClosedCaptions": true
  }
}
```

### Web/Mobile
```json
{
  "web": {
    "includeThree": true,
    "includeAudio": false,
    "defaultResolution": "1280x720",
    "defaultFPS": 30,
    "optimizeForStreaming": true
  }
}
```

## Preset Inheritance

Create base presets and extend them:

```json
{
  "presets": {
    "base": {
      "includeThree": true,
      "includeAudio": true,
      "includeTailwind": true
    },
    "youtube": {
      "extends": "base",
      "defaultResolution": "1920x1080",
      "defaultFPS": 30
    },
    "youtube-4k": {
      "extends": "youtube",
      "defaultResolution": "3840x2160",
      "defaultFPS": 60
    }
  }
}
```

## Preset Variables

Use environment variables in presets:

```json
{
  "presets": {
    "dynamic": {
      "defaultResolution": "${RESOLUTION:-1920x1080}",
      "defaultFPS": "${FPS:-30}",
      "includeThree": "${INCLUDE_THREE:-true}"
    }
  }
}
```

Usage:

```bash
RESOLUTION=2560x1440 FPS=60 bun scripts/setup.sh --preset dynamic
```

## Preset Validation

The setup script validates presets automatically:

### Required Fields
- `defaultResolution`: Must be "WxH" format
- `defaultFPS`: Must be positive number
- Dependencies must be boolean

### Supported Resolutions
- **SD**: 640x480, 720x480
- **HD**: 1280x720, 1920x1080
- **4K**: 3840x2160
- **Mobile**: 1080x1920, 750x1334
- **Square**: 1080x1080, 720x720

### Supported FPS
- **Film**: 24
- **Broadcast**: 29.97, 30
- **Web**: 30, 60
- **Mobile**: 30, 60
# Remotion Configuration Reference

## remotion.config.ts

Default configuration template:

```typescript
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)

export default {
  fps: 30,
  width: 1920,
  height: 1080,
  // Optional: Render settings
  chromiumImage: 'remotion-chromium',
  concurrency: 1,
  maxRetries: 1,
}
```

## Configuration Options

### Video Settings
- **fps**: Frames per second (default: 30)
- **width**: Video width in pixels
- **height**: Video height in pixels
- **durationInFrames**: Default duration (override per composition)

### Rendering Options
- **imageFormat**: 'jpeg' or 'png' (default: 'jpeg')
- **crf**: Quality factor for H.264 (default: 20)
- **pixelFormat**: Video pixel format

### Audio Settings
- **codec**: 'aac' (default) or 'mp3'
- **bitrate**: Audio bitrate in kbps

## Environment Variables

Create `.env` file:

```bash
# Rendering settings
RENDITION_CONCURRENCY=1
RENDITION_TIMEOUT_MILLISECONDS=120000

# Image settings
IMAGE_FORMAT=jpeg
JPEG_QUALITY=80

# Override defaults
DEFAULT_FPS=30
DEFAULT_WIDTH=1920
DEFAULT_HEIGHT=1080
```

## tsconfig.json

Key configuration options:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## tailwind.config.ts

Custom animations and design system:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
      },
    },
  },
}
```

## Package.json Scripts

Essential scripts for Remotion development:

```json
{
  "scripts": {
    "dev": "remotion studio",
    "build": "remotion bundle",
    "lint": "eslint src && tsc",
    "render": "remotion render",
    "still": "remotion still",
    "upgrade": "remotion upgrade"
  }
}
```

## Lambda Configuration

For cloud rendering, add to `remotion.config.ts`:

```typescript
import { enableLambda } from '@remotion/lambda'

enableLambda({
  region: 'us-east-1',
  timeoutInSeconds: 120,
})
```

## Performance Optimizations

### Memory Management
```typescript
export default {
  // Limit concurrent renders
  concurrency: 1,
  // Reduce memory usage
  chromiumOptions: {
    headless: true,
    gl: 'swiftshader',
  },
}
```

### Caching
```typescript
import { Config } from '@remotion/cli/config'

Config.setChromiumOpenGlRenderer('egl')
Config.setChromiumDisableWebSecurity(true)
```
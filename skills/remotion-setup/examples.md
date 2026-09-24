# Remotion Setup Examples

## Example Usage Scenarios

### 1. Standard YouTube Video Setup
```bash
# Using the standard preset (includes Three.js, audio, Tailwind)
./scripts/setup.sh --fps 30 --resolution 1920x1080
```

Creates a project optimized for YouTube with:
- 1920x1080 resolution
- 30 FPS for smooth playback
- Three.js for 3D animations
- Audio processing capabilities
- Tailwind CSS for styling

### 2. Social Media Square Video
```bash
# Perfect for Instagram/Facebook
./scripts/setup.sh --fps 30 --resolution 1080x1080
```

Creates a square video ideal for:
- Instagram posts
- Facebook feed videos
- Twitter posts

### 3. High-End Cinema Quality
```bash
# 4K 60fps for professional videos
./scripts/setup.sh --fps 60 --resolution 3840x2160
```

Produces cinema-quality videos with:
- 4K resolution
- 60 FPS for ultra-smooth motion
- Full feature set

### 4. Minimal Setup
```bash
# Bare bones Remotion project
./scripts/setup.sh --without-three --without-audio --without-tailwind
```

Creates a lightweight setup with:
- Only core Remotion dependencies
- Basic 2D video creation
- No additional frills

### 5. Adding to Existing React Project
```bash
# Incremental setup for existing projects
./scripts/setup.sh --incremental
```

Useful when:
- Adding video capabilities to existing apps
- Migrating from other animation libraries
- Expanding project functionality

## Custom Configuration Example

### Creating a Custom Preset

You can modify `scripts/config.json` to add custom presets:

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
    }
  }
}
```

### Using Environment Variables

Set project defaults via environment:

```bash
export PROJECT_NAME="my-awesome-video"
export DEFAULT_FPS=60
export DEFAULT_RESOLUTION="2560x1440"

./scripts/setup.sh
```

## Project Examples

### Example 1: Product Showcase

After setup, create a product showcase:

```tsx
// src/components/compositions/ProductShowcase.tsx
import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { useVideoTexture } from '../../use-texture'

export const ProductShowcase: React.FC = () => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 30], [0, 1])

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      <div
        style={{
          opacity,
          fontSize: 60,
          color: 'white',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <h1>Product Showcase</h1>
      </div>
    </AbsoluteFill>
  )
}
```

### Example 2: 3D Logo Animation (with Three.js)

```tsx
// src/components/compositions/LogoAnimation.tsx
import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

function AnimatedText() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime
    }
  })

  return (
    <Text
      ref={meshRef}
      fontSize={1}
      color="#F57E24"
      anchorX="center"
      anchorY="middle"
    >
      YOUR LOGO
    </Text>
  )
}

export const LogoAnimation: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <AnimatedText />
    </Canvas>
  )
}
```

### Example 3: Audio Visualization

```tsx
// src/components/compositions/AudioVisualizer.tsx
import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'

export const AudioVisualizer: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const audioData = useAudioData('public/audio.mp3')

  if (!audioData) {
    return null
  }

  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: 32,
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          gap: '2px',
        }}
      >
        {visualization.map((v, i) => (
          <div
            key={i}
            style={{
              width: '20px',
              height: `${v * 200}px`,
              backgroundColor: '#F57E24',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
```

## Tips and Best Practices

### Performance Optimization

1. **Use useMemo for expensive calculations**:
   ```tsx
   const expensiveValue = useMemo(() => {
     return calculateSomethingComplex(frame)
   }, [frame])
   ```

2. **Optimize video assets**:
   - Use compressed formats (H.264)
   - Pre-render complex animations
   - Use appropriate resolution

3. **Leverage Three.js optimizations**:
   - Reuse geometries and materials
   - Use instanced meshes for repeated objects
   - Implement LOD (Level of Detail)

### Asset Management

1. **Organize assets in public folder**:
   ```
   public/
   ├── videos/
   ├── audio/
   ├── images/
   └── fonts/
   ```

2. **Use consistent naming**:
   - `product-name.mp4`
   - `background-music.mp3`
   - `logo-animation.png`

3. **Preload critical assets**:
   ```tsx
   const preloadedTexture = useVideoTexture('public/intro.mp4')
   ```

### Common Workflows

1. **Start with mockups**:
   - Create placeholder components
   - Define timing and animations
   - Replace with real assets

2. **Iterate with preview**:
   - Use `remotion studio` for real-time preview
   - Export stills for keyframes
   - Test audio sync early

3. **Render in segments**:
   - Break long videos into scenes
   - Render and test individually
   - Combine in post-production

## Troubleshooting

### Common Issues

1. **Audio not loading**:
   - Check file format (MP3/WAV)
   - Verify file path in `public/` folder
   - Use `staticFile()` helper

2. **Three.js errors**:
   - Ensure dependencies match
   - Check WebGL support
   - Use correct import paths

3. **Performance issues**:
   - Reduce frame rate for preview
   - Simplify complex scenes
   - Use appropriate video codec

### Getting Help

- [Remotion Documentation](https://www.remotion.dev/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- Community Discord: [Remotion Discord](https://discord.gg/remotion-dev)
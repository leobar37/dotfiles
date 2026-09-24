# Component Templates Reference

## Base Components

### RoundedBox (3D)
Reusable 3D component with rounded corners:

```tsx
import React, { useMemo } from 'react'
import { Extrude } from '@react-three/drei'
import { Shape } from 'three'

interface RoundedBoxProps {
  width?: number
  height?: number
  depth?: number
  radius?: number
  material?: JSX.Element
}

export const RoundedBox: React.FC<RoundedBoxProps> = ({
  width = 1,
  height = 1,
  depth = 1,
  radius = 0.1,
  material,
  ...props
}) => {
  const shape = useMemo(() => {
    const s = new Shape()
    const w = width / 2
    const h = height / 2

    // Create rounded rectangle path
    s.moveTo(-w + radius, -h)
    s.absarc(w, -h + radius, radius, -Math.PI / 2, 0, false)
    s.absarc(w - radius, h, radius, 0, Math.PI / 2, false)
    s.absarc(-w, h - radius, radius, Math.PI / 2, Math.PI, false)
    s.absarc(-w + radius, -h, radius, Math.PI, -Math.PI / 2, false)

    return s
  }, [width, height, radius])

  return (
    <Extrude
      args={[shape, { depth, bevelEnabled: false }]}
      {...props}
    >
      {material}
    </Extrude>
  )
}
```

### VideoTexture Hook
Smart video texture loader with preview support:

```tsx
import { useEffect, useRef, useState } from 'react'
import { VideoTexture } from 'three'

export const useVideoTexture = (src: string) => {
  const videoRef = useRef<HTMLVideoElement>()
  const [texture, setTexture] = useState<VideoTexture | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true

    const handleLoad = () => {
      const tex = new VideoTexture(video)
      setTexture(tex)
      setIsLoaded(true)
      video.play()
    }

    video.addEventListener('loadeddata', handleLoad)

    return () => {
      video.pause()
      texture?.dispose()
      video.removeEventListener('loadeddata', handleLoad)
    }
  }, [src])

  return { texture, isLoaded }
}
```

## Composition Templates

### Basic Scene
Minimal video scene with title:

```tsx
import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'

interface TitleSceneProps {
  readonly title: string
  readonly subtitle?: string
}

export const TitleScene: React.FC<TitleSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame()

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      <div
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1
          style={{
            fontSize: 80,
            color: 'white',
            textAlign: 'center',
            marginBottom: 20,
            opacity: Math.min(1, frame / 30),
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 40,
              color: '#ccc',
              textAlign: 'center',
              opacity: Math.min(1, Math.max(0, (frame - 30) / 30)),
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </AbsoluteFill>
  )
}
```

### 3D Product Showcase
Product display with rotating camera:

```tsx
import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useVideoTexture } from '../use-texture'

interface ProductShowcaseProps {
  readonly videoSrc: string
  readonly rotationSpeed?: number
}

function RotatingMesh({ videoSrc, rotationSpeed = 0.01 }: ProductShowcaseProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { texture } = useVideoTexture(videoSrc)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 3]} />
      {texture && <meshStandardMaterial map={texture} />}
    </mesh>
  )
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = (props) => {
  return (
    <div style={{ flex: 1 }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <RotatingMesh {...props} />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  )
}
```

### Audio Visualizer
Audio-reactive visualization:

```tsx
import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'

export const AudioVisualizer: React.FC<{ audioSrc: string }> = ({ audioSrc }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const audioData = useAudioData(audioSrc)

  if (!audioData) return null

  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: 64,
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
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
              width: '10px',
              height: `${v * 300}px`,
              backgroundColor: `hsl(${(i / 64) * 360}, 100%, 50%)`,
              borderRadius: '5px',
              transform: `translateY(${-v * 150}px)`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
```

## UI Components

### Animated Text
Text with typewriter effect:

```tsx
import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'

interface AnimatedTextProps {
  readonly text: string
  readonly speed?: number
  readonly style?: React.CSSProperties
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame()
  const progress = interpolate(frame, [0, text.length * 2 / speed], [0, 1])
  const charCount = Math.floor(progress * text.length)

  return (
    <span style={style}>
      {text.slice(0, charCount)}
      <span style={{ opacity: frame % 2 > 0 ? 1 : 0 }}>|</span>
    </span>
  )
}
```

### Slide Transition
Content with slide animation:

```tsx
import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'

interface SlideProps {
  readonly children: React.ReactNode
  readonly direction?: 'left' | 'right' | 'up' | 'down'
  readonly duration?: number
}

export const Slide: React.FC<SlideProps> = ({
  children,
  direction = 'left',
  duration = 30,
}) => {
  const frame = useCurrentFrame()

  const getTransform = () => {
    const progress = interpolate(frame, [0, duration], [100, 0])

    switch (direction) {
      case 'left':
        return `translateX(-${progress}%)`
      case 'right':
        return `translateX(${progress}%)`
      case 'up':
        return `translateY(-${progress}%)`
      case 'down':
        return `translateY(${progress}%)`
    }
  }

  return (
    <AbsoluteFill
      style={{
        transform: getTransform(),
      }}
    >
      {children}
    </AbsoluteFill>
  )
}
```

## Best Practices

1. **Use React.FC with readonly props** - Ensures immutability
2. **Memoize expensive calculations** - Use useMemo for Three.js geometries
3. **Implement proper cleanup** - Dispose textures and event listeners
4. **Add TypeScript types** - Define interfaces for all props
5. **Use absolute imports** - Import from `remotion` and `@remotion/*` first
6. **Follow naming conventions** - PascalCase for components, camelCase for hooks
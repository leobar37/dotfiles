#!/bin/bash

# Remotion + React Three Fiber Project Setup Script
# Author: Claude Code Remotion Setup Skill
# Version: 1.0.0

set -e

# Default values
PROJECT_NAME=${PROJECT_NAME:-"my-remotion-project"}
WITH_THREE=${WITH_THREE:-true}
WITH_AUDIO=${WITH_AUDIO:-true}
WITH_TAILWIND=${WITH_TAILWIND:-true}
DEFAULT_FPS=${DEFAULT_FPS:-30}
DEFAULT_RESOLUTION=${DEFAULT_RESOLUTION:-"1920x1080"}
INCREMENTAL=${INCREMENTAL:-false}
MIGRATE=${MIGRATE:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --with-three)
                WITH_THREE=true
                shift
                ;;
            --without-three)
                WITH_THREE=false
                shift
                ;;
            --with-audio)
                WITH_AUDIO=true
                shift
                ;;
            --without-audio)
                WITH_AUDIO=false
                shift
                ;;
            --with-tailwind)
                WITH_TAILWIND=true
                shift
                ;;
            --without-tailwind)
                WITH_TAILWIND=false
                shift
                ;;
            --fps)
                DEFAULT_FPS="$2"
                shift 2
                ;;
            --resolution)
                DEFAULT_RESOLUTION="$2"
                shift 2
                ;;
            --incremental)
                INCREMENTAL=true
                shift
                ;;
            --migrate)
                MIGRATE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help message
show_help() {
    echo "Remotion Setup Script - Automatically configures Remotion video projects"
    echo
    echo "Usage: bun $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  --with-three         Include React Three Fiber dependencies (default)"
    echo "  --without-three      Exclude React Three Fiber"
    echo "  --with-audio         Include audio processing dependencies (default)"
    echo "  --without-audio      Exclude audio processing"
    echo "  --with-tailwind      Include Tailwind CSS v4 (default)"
    echo "  --without-tailwind   Exclude Tailwind CSS"
    echo "  --fps FPS            Set default FPS (default: 30)"
    echo "  --resolution WxH     Set default resolution (default: 1920x1080)"
    echo "  --incremental        Add to existing project"
    echo "  --migrate           Migrate from Remotion v3 to v4"
    echo "  -h, --help          Show this help message"
    echo
    echo "Examples:"
    echo "  bun $0                                    # Default setup"
    echo "  bun $0 --without-three --without-audio    # Minimal setup"
    echo "  bun $0 --fps 60 --resolution 3840x2160    # 4K 60fps setup"
    echo "  bun $0 --incremental                      # Add to existing project"
}

# Check if we're in the right directory
check_directory() {
    if [ "$MIGRATE" = false ] && [ "$INCREMENTAL" = false ]; then
        if [ -f "package.json" ]; then
            print_warning "package.json already exists. Use --incremental to add to existing project."
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
}

# Create directory structure
create_directories() {
    print_info "Creating directory structure..."

    # Create all directories
    mkdir -p src/components/base
    mkdir -p src/components/compositions
    mkdir -p src/components/ui
    mkdir -p src/design-system
    mkdir -p src/hooks
    mkdir -p src/helpers
    mkdir -p src/utils
    mkdir -p public
    mkdir -p scripts

    # Create .opencode/agent directory for agents
    mkdir -p .opencode/agent

    print_success "Directory structure created"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."

    # Always use bun
    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed. Please install bun first: https://bun.sh"
        exit 1
    fi

    # Base Remotion dependencies
    BASE_DEPS=(
        "remotion"
        "@remotion/cli"
        "react"
        "react-dom"
        "typescript"
        "@types/react"
        "@types/react-dom"
    )

    # Optional dependencies
    if [ "$WITH_THREE" = true ]; then
        BASE_DEPS+=(
            "@react-three/fiber"
            "@remotion/three"
            "three"
            "@types/three"
            "@react-three/drei"
        )
    fi

    if [ "$WITH_AUDIO" = true ]; then
        BASE_DEPS+=(
            "@remotion/media-utils"
        )
    fi

    if [ "$WITH_TAILWIND" = true ]; then
        BASE_DEPS+=(
            "@remotion/tailwind-v4"
            "tailwindcss"
        )
    fi

    # Dev dependencies
    DEV_DEPS=(
        "@remotion/eslint-config-flat"
        "eslint"
        "prettier"
        "playwright"
    )

    # Install with bun
    print_info "Installing with bun..."
    bun add ${BASE_DEPS[@]}
    bun add -d ${DEV_DEPS[@]}

    print_success "Dependencies installed successfully"
}

# Create configuration files
create_configs() {
    print_info "Creating configuration files..."

    # Parse resolution
    IFS='x' read -ra ADDR <<< "$DEFAULT_RESOLUTION"
    DEFAULT_WIDTH=${ADDR[0]}
    DEFAULT_HEIGHT=${ADDR[1]}

    # Remotion config
    cat > remotion.config.ts << EOF
import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)

// Default composition settings
const defaultConfig = {
  fps: $DEFAULT_FPS,
  width: $DEFAULT_WIDTH,
  height: $DEFAULT_HEIGHT,
}

export default {
  ...defaultConfig,
}
EOF

    # TypeScript config
    if [ ! -f "tsconfig.json" ]; then
        cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "remotion.config.ts"],
  "exclude": ["node_modules"]
}
EOF
    fi

    # ESLint config
    cat > eslint.config.mjs << EOF
import config from '@remotion/eslint-config-flat';

export default [
  ...config,
  {
    rules: {
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
EOF

    # Tailwind config (if enabled)
    if [ "$WITH_TAILWIND" = true ]; then
        cat > tailwind.config.ts << EOF
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
EOF
    fi

    print_success "Configuration files created"
}

# Create package.json scripts
create_package_scripts() {
    print_info "Updating package.json scripts..."

    # Update package.json with bun
    bun pkg --set scripts.dev="remotion studio"
    bun pkg --set scripts.build="remotion bundle"
    bun pkg --set scripts.lint="eslint src && tsc"
    bun pkg --set scripts.render="remotion render"
    bun pkg --set scripts.still="remotion still"
    bun pkg --set scripts.upgrade="remotion upgrade"

    print_success "Package.json scripts updated"
}

# Create base files
create_base_files() {
    print_info "Creating base files..."

    # Entry point
    cat > src/index.ts << EOF
import { registerRoot } from 'remotion'
import { Root } from './Root'

registerRoot(Root)
EOF

    # Root component
    cat > src/Root.tsx << EOF
import React from 'react'
import { Composition } from 'remotion'
import { ExampleScene } from './components/compositions/ExampleScene'

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ExampleScene"
        component={ExampleScene}
        durationInFrames={150}
        fps={$DEFAULT_FPS}
        width={$DEFAULT_WIDTH}
        height={$DEFAULT_HEIGHT}
      />
    </>
  )
}
EOF

    # Example scene
    cat > src/components/compositions/ExampleScene.tsx << EOF
import React from 'react'
import { AbsoluteFill } from 'remotion'

export const ExampleScene: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '80px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        Hello Remotion!
      </h1>
    </AbsoluteFill>
  )
}
EOF

    # If Three.js is included, create additional components
    if [ "$WITH_THREE" = true ]; then
        # RoundedBox component
        cat > src/RoundedBox.tsx << EOF
import React, { useMemo } from 'react'
import { MeshProps } from '@react-three/fiber'
import { Extrude } from '@react-three/drei'
import { Shape } from 'three'

interface RoundedBoxProps extends MeshProps {
  width?: number
  height?: number
  depth?: number
  radius?: number
}

export const RoundedBox: React.FC<RoundedBoxProps> = ({
  width = 1,
  height = 1,
  depth = 1,
  radius = 0.1,
  ...props
}) => {
  const shape = useMemo(() => {
    const shape = new Shape()
    const w = width / 2
    const h = height / 2

    shape.moveTo(-w + radius, -h)
    shape.lineTo(w - radius, -h)
    shape.absarc(w, -h + radius, radius, -Math.PI / 2, 0, false)
    shape.lineTo(w, h - radius)
    shape.absarc(w - radius, h, radius, 0, Math.PI / 2, false)
    shape.lineTo(-w + radius, h)
    shape.absarc(-w, h - radius, radius, Math.PI / 2, Math.PI, false)
    shape.lineTo(-w, -h + radius)
    shape.absarc(-w + radius, -h, radius, Math.PI, -Math.PI / 2, false)

    return shape
  }, [width, height, radius])

  return (
    <Extrude
      args={[
        shape,
        {
          depth,
          bevelEnabled: false,
        },
      ]}
      {...props}
    />
  )
}
EOF

        # Video texture hook
        cat > src/use-texture.ts << EOF
import { useEffect, useRef, useState } from 'react'
import { Texture, VideoTexture } from 'three'

export const useVideoTexture = (src: string) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    const video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.play()

    videoRef.current = video

    const tex = new VideoTexture(video)
    setTexture(tex)

    return () => {
      video.pause()
      tex.dispose()
    }
  }, [src])

  return texture
}
EOF
    fi

    print_success "Base files created"
}

# Create AGENTS.md file
create_agents_md() {
    print_info "Creating AGENTS.md file..."

    cat > AGENTS.md << 'EOF'
# Agent Guidelines for Remotion + React Three Fiber Project

## About Remotion

Remotion is a framework that can create videos programmatically. It is based on React.js. All output should be valid React code and be written in TypeScript.

## Specialized Agents

This project has specialized agents for different tasks:

- **remotion-expert** (.opencode/agent/remotion-expert.md) - Main Remotion expert for animations, components, and Tailwind CSS patterns
- **remotion-motion** (.opencode/agent/remotion-motion.md) - Three.js + Remotion integration for 3D animations, video textures, and React Three Fiber

Consult these agents for detailed patterns, examples, and best practices specific to their domains.

## Build/Lint/Test Commands

- **Dev**: bun run dev - Start Remotion studio
- **Build**: bun run build - Bundle the project
- **Lint**: bun run lint - Run ESLint and TypeScript checks
- **Render**: bunx remotion render [id] - Render MP4 video (e.g., bunx remotion render MyComp)
- **Still**: bunx remotion still [id] - Render still image
- **Type Check**: tsc - TypeScript compiler check
- **Scaffold**: bunx create-video@latest --blank - Create new Remotion project

## Code Style

- **Imports**: React imports first, then third-party (remotion, @react-three/fiber), then local files
- **Formatting**: 2 spaces, no tabs, bracket spacing enabled (see .prettierrc)
- **Types**: Strict TypeScript enabled. Use readonly for React component props. Define explicit types for complex objects
- **React**: Use React.FC with typed props. Prefer functional components with hooks
- **Naming**: camelCase for variables/functions, PascalCase for components, UPPER_SNAKE_CASE for constants
- **Styling**: This project uses Tailwind CSS v4 via @remotion/tailwind-v4. Use className for static styles and style for dynamic animations. See remotion-expert agent for detailed patterns.
- **Three.js**: Use useMemo for geometries and expensive calculations. useEffect for camera/texture setup
- **Error Handling**: TypeScript strict mode enforced (noUnusedLocals, forceConsistentCasingInFileNames)
- **Comments**: Add descriptive comments for complex calculations and animations (see Phone.tsx examples)

## Project Structure

A Remotion Project consists of:

- **Entry file** (src/index.ts): Uses registerRoot(Root) to register the root component
- **Root file** (src/Root.tsx): Contains <Composition> components defining videos
- **Component files**: React components that render video content
- **Base components**: src/components/base/ - Reusable animated components
- **Compositions**: src/components/compositions/ - Video scenes and sequences
- **Design System**: src/design-system/ - Colors, animations, typography (see remotion-expert for usage)
- **Hooks**: src/hooks/ - Custom React hooks for animations and effects
- **Helpers**: src/helpers/ - Utility functions
- Define schemas with zod for composition props

## Custom Utilities

### Hooks

- **src/use-texture.ts** - Smart video texture loader that automatically switches between preview and rendering modes

### Components

- **src/RoundedBox.tsx** - Pre-built 3D component for extruded shapes with rounded corners

### Composition Defaults

- Default frame rate: $DEFAULT_FPS fps
- Default resolution: ${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}
- Default id: "MyComp"
- Frame numbers start at 0

## Remotion API Essentials

### Core Hooks

- useCurrentFrame() - Get current frame number (starts at 0)
- useVideoConfig() - Get fps, durationInFrames, width, height

### Animation Helpers

- interpolate(value, [inputRange], [outputRange], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) - Animate values over time
- spring({fps, frame, config: {damping: 200}}) - Spring animations (default damping: 200)
- random('seed') - Deterministic random (0-1). NEVER use Math.random()

### Layout Components

- <AbsoluteFill> - Layer elements on top of each other
- <Sequence from={10} durationInFrames={20}> - Place element later in video. "from" can be negative to cut off first frames
- <Series> with <Series.Sequence durationInFrames={20} offset={-8}> - Display elements sequentially
- <TransitionSeries> from "@remotion/transitions" - Transitions between sequences using fade(), wipe(), etc.

### Media Components

- <Video src="..." /> from "@remotion/media" - Props: trimBefore, trimAfter, volume (0-1)
- <Audio src="..." /> from "@remotion/media" - Props: trimBefore, trimAfter, volume (0-1)
- <Img src="..." /> from "remotion" - For static images
- <Gif src="..." /> from "@remotion/gif" - For animated GIFs
- Use staticFile('filename') for assets in public/ folder

### Important Rules

- All React code must be deterministic
- Use random('seed') instead of Math.random()
- Child components of Sequence: useCurrentFrame() starts at 0 from Sequence's "from" prop
- Always include extrapolateLeft/Right: 'clamp' in interpolate() by default
EOF

    print_success "AGENTS.md created"
}

# Create agent templates
create_agent_templates() {
    print_info "Creating agent templates..."

    # Remotion expert agent
    cat > .opencode/agent/remotion-expert.md << 'EOF'
---
description: Expert Remotion developer knowing when to consult each skill file for animations, reusability, transforms, layers, fonts, Three.js integration, and comprehensive video production patterns. Use for any Remotion development, animation work, component design, or video production tasks.
mode: all
temperature: 0.3
tools:
  write: true
  edit: true
  bash: true
---

# Remotion Expert

Comprehensive Remotion expert with deep knowledge of all animation patterns, component architecture, and video production best practices.

**SCOPE**: This agent is the go-to expert for all Remotion development. Use when:

- Creating any type of Remotion animation or video content
- Designing reusable animated components
- Working with transforms, layers, and typography
- Building complex video compositions and sequences
- Optimizing performance for video rendering
- Debugging animation timing and synchronization issues
- Keywords: "Remotion", "animation", "video", "component", "transform", "layer", "font"

## Quick Reference

### Essential Hooks
- `useCurrentFrame()` - Get current frame (0-based)
- `useVideoConfig()` - Get fps, duration, dimensions
- `interpolate()` - Smooth value transitions
- `spring()` - Physics-based animations

### Layout Components
- `<AbsoluteFill>` - Full-screen layering
- `<Sequence>` - Time-based sequencing
- `<Series>` - Sequential element display

### Asset Handling
- `<Img>` - Static images (staticFile())
- `<Video>` - Video clips (trim, volume)
- `<Audio>` - Audio tracks (trim, volume)

## Best Practices

1. **Always use TypeScript** with strict mode
2. **Prefer functional components** with hooks
3. **Use useMemo** for expensive calculations
4. **Create reusable components** in `src/components/base/`
5. **Organize compositions** in `src/components/compositions/`
6. **Add descriptive comments** for complex animations
EOF

    # Remotion motion agent for Three.js
    cat > .opencode/agent/remotion-motion.md << 'EOF'
---
description: Three.js + Remotion integration expert specializing in 3D animations, video textures, React Three Fiber, and 3D performance optimization. Use for any Three.js work in Remotion projects.
mode: all
temperature: 0.3
tools:
  write: true
  edit: true
  bash: true
---

# Remotion Motion Expert

Three.js and React Three Fiber specialist for Remotion projects, focused on 3D animations, video textures, and performance optimization.

**SCOPE**: Expert in 3D content creation for videos. Use when:

- Integrating Three.js or React Three Fiber
- Creating 3D scenes, geometries, or materials
- Working with video textures on 3D objects
- Optimizing 3D performance for video rendering
- Building 3D transitions and effects
- Keywords: "Three.js", "3D", "R3F", "@react-three/fiber", "texture", "geometry"

## Core Patterns

### Video Textures
Use the `use-video-texture.ts` hook for seamless video integration:
```tsx
import { useVideoTexture } from '../use-texture'

const texture = useVideoTexture('public/video.mp4')
```

### Performance Rules
- Use `useMemo` for geometries and materials
- Reuse textures across frames
- Implement LOD for complex scenes
- Use `drei` helpers when possible

### Common Components
- `RoundedBox` - Extruded shapes with rounded corners
- Phone/tablet mockups - Device frames with video screens
- Particle systems - Background effects
- 3D text - Typography with depth
EOF

    print_success "Agent templates created"
}

# Create additional setup files
create_additional_files() {
    print_info "Creating additional setup files..."

    # .gitignore
    if [ ! -f ".gitignore" ]; then
        cat > .gitignore << EOF
# Dependencies
node_modules
bun.lockb

# Build outputs
dist/
build/
out/
.remotion/

# Environment
.env
.env.local
.env.production

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary folders
tmp/
temp/

# Audio/Video working files
recordings/
videos/*.mp4
videos/*.mov
audio/*.wav
audio/*.mp3
EOF
    fi

    # Prettier config
    if [ ! -f ".prettierrc" ]; then
        cat > .prettierrc << EOF
{
  "arrowParens": "always",
  "bracketSpacing": true,
  "endOfLine": "lf",
  "printWidth": 80,
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "useTabs": false
}
EOF
    fi

    # .env.example
    cat > .env.example << EOF
# Remotion Environment Variables
# Copy this file to .env and fill in your values

# Rendering settings
RENDITION_CONCURRENCY=1
RENDITION_TIMEOUT_MILLISECONDS=120000

# Image settings
IMAGE_FORMAT="jpeg"
JPEG_QUALITY=80

# Optional: Override default FPS
# DEFAULT_FPS=30

# Optional: Override default resolution
# DEFAULT_WIDTH=1920
# DEFAULT_HEIGHT=1080
EOF

    print_success "Additional files created"
}

# Main execution
main() {
    print_info "Starting Remotion project setup..."

    parse_args "$@"
    check_directory

    if [ "$INCREMENTAL" = false ]; then
        create_directories
        install_dependencies
        create_configs
        create_base_files
        create_agents_md
        create_agent_templates
        create_additional_files
    fi

    create_package_scripts

    print_success "Setup completed successfully!"
    echo
    print_info "Next steps:"
    echo "1. Run 'bun run dev' to start the development server"
    echo "2. Open http://localhost:3000 in your browser"
    echo "3. Start creating your video compositions in src/components/compositions/"
    echo
    print_info "Useful commands:"
    echo "- Render video: bun run render <composition-id>"
    echo "- Export still: bun run still <composition-id>"
    echo "- Lint code: bun run lint"
    echo
    print_info "Project structure:"
    echo "- AGENTS.md - Agent guidelines and best practices"
    echo "- src/components/compositions/ - Your video scenes"
    echo "- src/components/base/ - Reusable components"
    echo "- src/design-system/ - Styling and animations"
    echo "- .opencode/agent/ - Specialized AI agents"
}

# Run main function with all arguments
main "$@"
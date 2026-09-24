# AI Agents Setup Reference

## Agent Structure

Remotion projects use specialized AI agents for different aspects of development:

```
.opencode/agent/
├── remotion-expert.md      # Main Remotion expert
├── remotion-motion.md      # 3D/Three.js specialist
└── [custom-agents].md      # Additional specialized agents
```

## Core Agents

### remotion-expert.md
Main expert for all Remotion development:

```yaml
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
```

### remotion-motion.md
Three.js and 3D specialist:

```yaml
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
```

## Custom Agent Templates

### Audio Specialist Agent
`.opencode/agent/audio-expert.md`:

```yaml
---
description: Audio synchronization and processing expert for Remotion videos. Specializes in waveform visualization, lip sync, audio-reactive animations, and sound design integration.
mode: all
temperature: 0.3
tools:
  write: true
  edit: true
  bash: true
---

# Audio Expert

Audio specialist for Remotion projects focusing on synchronization, visualization, and sound design.

**SCOPE**: Use when working with audio in Remotion:

- Synchronizing animations to audio
- Creating audio visualizers
- Working with waveforms
- Implementing lip sync
- Audio-reactive effects
- Keywords: "audio", "sound", "waveform", "sync", "music"
```

### Performance Agent
`.opencode/agent/performance-expert.md`:

```yaml
---
description: Remotion performance optimization expert specializing in rendering speed, memory management, and complex scene optimization. Use for performance-critical projects or when videos render slowly.
mode: all
temperature: 0.3
tools:
  write: true
  edit: true
  bash: true
---

# Performance Expert

Optimization specialist for fast and efficient Remotion video rendering.

**SCOPE**: Use for performance-related tasks:

- Slow rendering issues
- Memory optimization
- Complex scene optimization
- Large asset handling
- Render farm setup
- Keywords: "performance", "optimize", "speed", "memory", "render"
```

## Agent Configuration

### Mode Options
- **all**: Agent can read, write, and execute
- **write**: Agent can create and edit files
- **read**: Agent can only read files

### Temperature Settings
- **0.1-0.3**: Precise, technical work (debugging, optimization)
- **0.5-0.7**: Creative work (design, animation)
- **0.8-1.0**: Highly creative (conceptual, brainstorming)

### Tools Configuration
```yaml
tools:
  write: true      # Can create/edit files
  edit: true       # Can modify existing files
  bash: true       # Can run commands
  read: true       # Can read files (usually implicit)
```

## Agent Collaboration

### Workflow Example
1. **Start with remotion-expert** for overall structure
2. **Switch to remotion-motion** for 3D work
3. **Use audio-expert** for sound synchronization
4. **Apply performance-expert** for optimization

### Agent Handoffs
Use explicit handoffs in prompts:

```
// Ask remotion-expert to set up basic structure
Create a composition with a title slide and 3 content sections

// Then hand off to specialist
Now ask remotion-motion to add a 3D animated transition between sections
```

## Agent Best Practices

### Agent Guidelines
1. **Clear scope definition** - Each agent should have a specific domain
2. **Keyword triggers** - Include relevant keywords for discovery
3. **Tool permissions** - Grant only necessary tools
4. **Temperature setting** - Match temperature to task type

### Agent Updates
When updating agents:
1. Version control with git
2. Document changes in AGENTS.md
3. Test with real tasks
4. Get feedback from team

### Custom Agent Creation
To create a new specialist agent:

1. **Identify domain gap** - What's not covered?
2. **Define scope** - Clear boundaries of expertise
3. **Set permissions** - Minimum necessary tools
4. **Write documentation** - Examples and patterns
5. **Test thoroughly** - Verify effectiveness

## AGENTS.md Maintenance

Keep the project's AGENTS.md updated with:

1. **Agent descriptions** - What each agent does
2. **Usage examples** - When to use which agent
3. **Collaboration patterns** - How agents work together
4. **Contact information** - Who maintains each agent

Example AGENTS.md entry:

```markdown
## Agent Guidelines

### Specialized Agents

This project has specialized agents for different tasks:

- **remotion-expert** - Main Remotion expert for animations, components, and Tailwind CSS patterns
- **remotion-motion** - Three.js + Remotion integration for 3D animations and video textures
- **audio-expert** - Audio synchronization and visualization specialist
- **performance-expert** - Rendering optimization and memory management

### When to Use Each

Use **remotion-expert** for:
- Component architecture
- Animation timing
- General Remotion questions

Use **remotion-motion** for:
- 3D scenes and models
- Video textures
- React Three Fiber integration

Use **audio-expert** for:
- Waveform visualizations
- Audio-reactive animations
- Lip sync effects

Use **performance-expert** for:
- Slow rendering issues
- Memory optimization
- Large projects
```
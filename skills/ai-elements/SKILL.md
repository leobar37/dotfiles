---
name: ai-elements
description: Create or integrate AI chat interface components and composable UI primitives that pair with the AI SDK runtime. Use when building message UIs, tool-rendering surfaces, conversations, or installing/adapting ai-elements components in an app.
---

# AI Elements

[AI Elements](https://elements.ai-sdk.dev) is a component library and custom registry built on top of [shadcn/ui](https://ui.shadcn.com/) to help you build AI-native applications faster. It provides pre-built components like conversations, messages, code blocks, voice interfaces, and workflow builders.

## Quick Start

```bash
# Install a component
npx ai-elements@latest add message

# Or use shadcn CLI
npx shadcn@latest add @ai-elements/message
```

## Prerequisites

- [Node.js](https://nodejs.org/en/download/) 18+
- [Next.js](https://nextjs.org/) 14+ (App Router recommended)
- [AI SDK](https://ai-sdk.dev/) installed
- [shadcn/ui](https://ui.shadcn.com/) initialized
- [Tailwind CSS](https://tailwindcss.com/) 4

## Installing Components

```bash
# Using AI Elements CLI (recommended)
npx ai-elements@latest add <component-name>

# Using shadcn CLI
npx shadcn@latest add @ai-elements/<component-name>
```

Components are added to `@/components/ai-elements/` by default.

---

## Components by Category

### Chatbot Components

| Component | Description | Installation |
|-----------|-------------|--------------|
| [Message](#message) | Display chat messages with actions, branching, markdown | `npx ai-elements@latest add message` |
| [Conversation](#conversation) | Scrollable container with auto-scroll and download | `npx ai-elements@latest add conversation` |
| [Prompt Input](#prompt-input) | Textarea with attachments, model picker, actions | `npx ai-elements@latest add prompt-input` |
| [Tool](#tool) | Collapsible tool invocation display | `npx ai-elements@latest add tool` |
| [Attachments](#attachments) | File/image attachment display | `npx ai-elements@latest add attachments` |
| [Chain of Thought](#chain-of-thought) | Step-by-step reasoning visualization | `npx ai-elements@latest add chain-of-thought` |
| [Checkpoint](#checkpoint) | Conversation history markers | `npx ai-elements@latest add checkpoint` |
| [Confirmation](#confirmation) | Tool approval workflow UI | `npx ai-elements@latest add confirmation` |
| [Context](#context) | Token/cost usage display | `npx ai-elements@latest add context` |
| [Inline Citation](#inline-citation) | Hoverable citation references | `npx ai-elements@latest add inline-citation` |
| [Model Selector](#model-selector) | Searchable model picker | `npx ai-elements@latest add model-selector` |
| [Plan](#plan) | Execution plan display with streaming | `npx ai-elements@latest add plan` |
| [Queue](#queue) | Task/message queue display | `npx ai-elements@latest add queue` |
| [Reasoning](#reasoning) | Collapsible AI reasoning display | `npx ai-elements@latest add reasoning` |
| [Shimmer](#shimmer) | Animated loading shimmer effect | `npx ai-elements@latest add shimmer` |
| [Sources](#sources) | Source citations display | `npx ai-elements@latest add sources` |
| [Suggestion](#suggestion) | Clickable suggestion buttons | `npx ai-elements@latest add suggestion` |
| [Task](#task) | Task list with progress tracking | `npx ai-elements@latest add task` |

### Code Components

| Component | Description | Installation |
|-----------|-------------|--------------|
| [Agent](#agent) | AI agent display with status | `npx ai-elements@latest add agent` |
| [Artifact](#artifact) | Container for generated code/docs | `npx ai-elements@latest add artifact` |
| [Code Block](#code-block) | Syntax highlighted code | `npx ai-elements@latest add code-block` |
| [Commit](#commit) | Git commit display | `npx ai-elements@latest add commit` |
| [Environment Variables](#environment-variables) | Env var display with masking | `npx ai-elements@latest add environment-variables` |
| [File Tree](#file-tree) | Hierarchical file structure | `npx ai-elements@latest add file-tree` |
| [JSX Preview](#jsx-preview) | Render JSX strings dynamically | `npx ai-elements@latest add jsx-preview` |
| [Package Info](#package-info) | Dependency info display | `npx ai-elements@latest add package-info` |
| [Sandbox](#sandbox) | Code + output container | `npx ai-elements@latest add sandbox` |
| [Schema Display](#schema-display) | REST API documentation | `npx ai-elements@latest add schema-display` |
| [Snippet](#snippet) | Inline code commands | `npx ai-elements@latest add snippet` |
| [Stack Trace](#stack-trace) | Error stack trace display | `npx ai-elements@latest add stack-trace` |
| [Terminal](#terminal) | Terminal output display | `npx ai-elements@latest add terminal` |
| [Test Results](#test-results) | Test suite results | `npx ai-elements@latest add test-results` |
| [Web Preview](#web-preview) | iframe preview container | `npx ai-elements@latest add web-preview` |

### Voice Components

| Component | Description | Installation |
|-----------|-------------|--------------|
| [Audio Player](#audio-player) | Audio playback with waveform | `npx ai-elements@latest add audio-player` |
| [Mic Selector](#mic-selector) | Microphone picker dropdown | `npx ai-elements@latest add mic-selector` |
| [Persona](#persona) | Animated AI avatar (Rive) | `npx ai-elements@latest add persona` |
| [Speech Input](#speech-input) | Voice capture button | `npx ai-elements@latest add speech-input` |
| [Transcription](#transcription) | Synchronized transcript display | `npx ai-elements@latest add transcription` |
| [Voice Selector](#voice-selector) | AI voice picker | `npx ai-elements@latest add voice-selector` |

### Workflow Components

| Component | Description | Installation |
|-----------|-------------|--------------|
| [Canvas](#canvas) | React Flow canvas base | `npx ai-elements@latest add canvas` |
| [Connection](#connection) | Animated connection lines | `npx ai-elements@latest add connection` |
| [Controls](#controls) | Zoom/pan controls | `npx ai-elements@latest add controls` |
| [Edge](#edge) | Node connection edges | `npx ai-elements@latest add edge` |
| [Node](#node) | Canvas node component | `npx ai-elements@latest add node` |
| [Panel](#panel) | Positioned overlay panel | `npx ai-elements@latest add panel` |
| [Toolbar](#toolbar) | Node toolbar | `npx ai-elements@latest add toolbar` |

### Utilities

| Component | Description | Installation |
|-----------|-------------|--------------|
| [Image](#image) | AI-generated image display | `npx ai-elements@latest add image` |
| [Open In Chat](#open-in-chat) | Share to other AI apps | `npx ai-elements@latest add open-in-chat` |

---

## Component Details

### Message

Display chat messages with response branching, action buttons, markdown rendering, and file attachments.

```tsx
import { Message, MessageContent, MessageResponse, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { useChat } from "@ai-sdk/react";

const { messages } = useChat();

{messages.map((message) => (
  <Message from={message.role} key={message.id}>
    <MessageContent>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return <MessageResponse key={i}>{part.text}</MessageResponse>;
        }
      })}
    </MessageContent>
  </Message>
))}
```

**Subcomponents:** `Message`, `MessageContent`, `MessageResponse`, `MessageActions`, `MessageAction`, `MessageBranch`, `MessageBranchSelector`, `MessageFile`, `MessageFiles`

---

### Conversation

Scrollable container with auto-scroll, scroll button, and conversation download.

```tsx
import { Conversation, ConversationContent, ConversationScrollButton, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message } from "@/components/ai-elements/message";

<Conversation>
  <ConversationContent>
    {messages.length === 0 ? (
      <ConversationEmptyState title="Start a conversation" />
    ) : (
      messages.map((message) => (
        <Message from={message.role} key={message.id}>...</Message>
      ))
    )}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

**Features:** Auto-scroll to bottom, smooth scrolling, scroll button visibility, Markdown download, empty state.

---

### Prompt Input

Rich textarea with file attachments, model picker, screenshot capture, and drag-drop support.

```tsx
import { PromptInput, PromptInputTextarea, PromptInputSubmit, PromptInputFooter, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { useChat } from "@ai-sdk/react";

const { sendMessage, status } = useChat();

<PromptInput onSubmit={(message) => sendMessage({ text: message.text })}>
  <PromptInputFooter>
    <PromptInputTools>...</PromptInputTools>
    <PromptInputSubmit status={status} />
  </PromptInputFooter>
</PromptInput>
```

**Hooks:** `usePromptInputAttachments`, `usePromptInputController`, `useProviderAttachments`, `usePromptInputReferencedSources`

---

### Tool

Collapsible tool invocation display for AI SDK tool calls.

```tsx
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";

<Tool defaultOpen>
  <ToolHeader type="fetch_weather" state={tool.state} />
  <ToolContent>
    <ToolInput input={tool.input} />
    <ToolOutput output={tool.output} />
  </ToolContent>
</Tool>
```

**States:** `pending`, `running`, `completed`, `error`

---

### Attachments

File/image attachment display with preview and remove functionality.

```tsx
import { Attachment, Attachments, AttachmentPreview, AttachmentRemove } from "@/components/ai-elements/attachments";

<Attachments>
  {files.map((file) => (
    <Attachment data={file} key={file.id} onRemove={() => remove(file.id)}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  ))}
</Attachments>
```

---

### Chain of Thought

Visualize AI reasoning with step-by-step progress indicators.

```tsx
import { ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtStep, ChainOfThoughtContent } from "@/components/ai-elements/chain-of-thought";

<ChainOfThought>
  <ChainOfThoughtHeader />
  <ChainOfThoughtStep icon={SearchIcon} label="Searching" status="complete" />
  <ChainOfThoughtStep icon={FileIcon} label="Reading files" status="active" />
  <ChainOfThoughtContent>...</ChainOfThoughtContent>
</ChainOfThought>
```

---

### Checkpoint

Mark conversation history points for restoration.

```tsx
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai-elements/checkpoint";

<Checkpoint>
  <CheckpointIcon />
  <CheckpointTrigger onClick={() => restoreToCheckpoint(id)}>
    Restore checkpoint
  </CheckpointTrigger>
</Checkpoint>
```

---

### Confirmation

Tool execution approval workflow UI.

```tsx
import { Confirmation, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, ConfirmationActions } from "@/components/ai-elements/confirmation";

<Confirmation approval={tool.approval} state={tool.state}>
  <ConfirmationRequest>
    This tool wants to delete {filePath}. Approve?
  </ConfirmationRequest>
  <ConfirmationAccepted>Execution approved</ConfirmationAccepted>
  <ConfirmationRejected>Execution rejected</ConfirmationRejected>
  <ConfirmationActions>
    <ConfirmationAction onClick={() => reject()}>Reject</ConfirmationAction>
    <ConfirmationAction onClick={() => approve()}>Approve</ConfirmationAction>
  </ConfirmationActions>
</Confirmation>
```

---

### Context

Display AI model context window usage, tokens, and cost estimation.

```tsx
import { Context, ContextProgress, ContextHeader, ContextBody, ContextInputUsage, ContextOutputUsage } from "@/components/ai-elements/context";

<Context modelId="gpt-4o">
  <ContextProgress />
  <ContextHeader>
    <ContextInputUsage>32K</ContextInputUsage>
    <ContextOutputUsage>8K</ContextOutputUsage>
  </ContextHeader>
</Context>
```

---

### Inline Citation

Hoverable citation component for AI-generated content with references.

```tsx
import { InlineCitation, InlineCitationCard, InlineCitationCardTrigger, InlineCitationCardBody } from "@/components/ai-elements/inline-citation";

<InlineCitation>
  <InlineCitationCard>
    <InlineCitationCardTrigger sources={[citation.url]} />
    <InlineCitationCardBody>
      <InlineCitationSource title={citation.title} url={citation.url} />
    </InlineCitationCardBody>
  </InlineCitationCard>
</InlineCitation>
```

---

### Model Selector

Searchable command palette for selecting AI models.

```tsx
import { ModelSelector, ModelSelectorList, ModelSelectorItem } from "@/components/ai-elements/model-selector";

<ModelSelector
  models={[{ id: "gpt-4o", name: "GPT-4o" }]}
  selectedModel={model}
  onSelect={(model) => setModel(model)}
/>
```

---

### Plan

Collapsible execution plan display with streaming support.

```tsx
import { Plan, PlanHeader, PlanContent } from "@/components/ai-elements/plan";

<Plan>
  <PlanHeader title={plan.title} />
  <PlanContent>...</PlanContent>
</Plan>
```

---

### Queue

Display task/message queues with collapsible sections.

```tsx
import { Queue, QueueItem, QueueItemDescription, QueueItemIndicator } from "@/components/ai-elements/queue";

<Queue>
  <QueueItem>
    <QueueItemIndicator status="pending" />
    <QueueItemDescription>Task description</QueueItemDescription>
  </QueueItem>
</Queue>
```

---

### Reasoning

Collapsible AI reasoning display with automatic open/close during streaming.

```tsx
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { useReasoning } from "@/components/ai-elements/reasoning";

const { isStreaming, isOpen } = useReasoning();

<Reasoning isStreaming={isStreaming}>
  <ReasoningTrigger />
  <ReasoningContent>AI reasoning text...</ReasoningContent>
</Reasoning>
```

---

### Shimmer

Animated text shimmer for loading states.

```tsx
import { Shimmer } from "@/components/ai-elements/shimmer";

<Shimmer duration={2}>Loading...</Shimmer>
```

---

### Sources

Display source citations for AI responses.

```tsx
import { Sources, Source, SourceTitle, SourceDescription } from "@/components/ai-elements/sources";

<Sources>
  {sources.map((source) => (
    <Source key={source.url} url={source.url}>
      <SourceTitle>{source.title}</SourceTitle>
      <SourceDescription>{source.description}</SourceDescription>
    </Source>
  ))}
</Sources>
```

---

### Suggestion

Clickable suggestion buttons for user interaction.

```tsx
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

<Suggestions>
  <Suggestion onClick={handleSuggestion} suggestion="Explain React hooks" />
  <Suggestion onClick={handleSuggestion} suggestion="What is TypeScript?" />
</Suggestions>
```

---

### Task

Task list with progress indicators and file icons.

```tsx
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/components/ai-elements/task";

<Task>
  <TaskTrigger title="Implementing auth" />
  <TaskContent>
    <TaskItem>Created login page</TaskItem>
    <TaskItemFile name="auth.ts" icon="typescript" />
  </TaskContent>
</Task>
```

---

### Agent

Display AI agent status and activities.

```tsx
import { Agent, AgentHeader, AgentStatus, AgentActivity } from "@/components/ai-elements/agent";

<Agent>
  <AgentHeader name="Coding Agent" status="running" />
  <AgentActivity>Searching for files...</AgentActivity>
</Agent>
```

---

### Artifact

Container for generated code, documents, or other AI outputs.

```tsx
import { Artifact, ArtifactHeader, ArtifactContent } from "@/components/ai-elements/artifact";

<Artifact
  title="Generated Code"
  description="React component"
  onClose={() => {}}
>
  <ArtifactContent>
    <CodeBlock code={code} language="tsx" />
  </ArtifactContent>
</Artifact>
```

---

### Code Block

Syntax highlighted code with copy button.

```tsx
import { CodeBlock } from "@/components/ai-elements/code-block";

<CodeBlock code="const x = 1;" language="typescript" />
```

---

### Commit

Git commit display with hash, author, and file changes.

```tsx
import { Commit, CommitHeader, CommitFiles } from "@/components/ai-elements/commit";

<Commit
  hash="a1b2c3d"
  message="feat: add new feature"
  author="User"
  timestamp={new Date()}
/>
```

---

### Environment Variables

Display env vars with masking and visibility toggle.

```tsx
import { EnvironmentVariables, EnvironmentVariable } from "@/components/ai-elements/environment-variables";

<EnvironmentVariables>
  <EnvironmentVariable name="DATABASE_URL" value="..." required />
  <EnvironmentVariable name="API_KEY" value="..." masked />
</EnvironmentVariables>
```

---

### File Tree

Hierarchical file/folder structure with expand/collapse.

```tsx
import { FileTree, FileTreeFolder, FileTreeFile } from "@/components/ai-elements/file-tree";

<FileTree>
  <FileTreeFolder name="src" defaultOpen>
    <FileTreeFile name="index.ts" />
    <FileTreeFile name="app.tsx" />
  </FileTreeFolder>
</FileTree>
```

---

### JSX Preview

Dynamically render JSX strings with streaming support.

```tsx
import { JSXPreview, JSXPreviewContent } from "@/components/ai-elements/jsx-preview";

<JSXPreview jsx={jsxString} isStreaming={true}>
  <JSXPreviewContent />
</JSXPreview>
```

---

### Package Info

Display npm package info with version changes.

```tsx
import { PackageInfo, PackageInfoVersion, PackageInfoDependency } from "@/components/ai-elements/package-info";

<PackageInfo
  name="react"
  currentVersion="18.2.0"
  newVersion="19.0.0"
  changeType="major"
/>
```

---

### Sandbox

Collapsible code + output container for AI-generated code.

```tsx
import { Sandbox, SandboxTabs, SandboxTabContent } from "@/components/ai-elements/sandbox";

<Sandbox state="completed" title="code.tsx">
  <SandboxTabs>
    <SandboxTabContent value="code">
      <CodeBlock code={code} />
    </SandboxTabContent>
    <SandboxTabContent value="output">
      <CodeBlock code={output} language="log" />
    </SandboxTabContent>
  </SandboxTabs>
</Sandbox>
```

---

### Schema Display

REST API endpoint documentation display.

```tsx
import { SchemaDisplay, SchemaDisplayHeader, SchemaDisplayPath, SchemaDisplayParameters } from "@/components/ai-elements/schema-display";

<SchemaDisplay method="POST" path="/api/users/{userId}/posts">
  <SchemaDisplayParameters>
    <SchemaDisplayParameter name="userId" type="string" location="path" required />
  </SchemaDisplayParameters>
</SchemaDisplay>
```

---

### Snippet

Inline terminal command display with copy.

```tsx
import { Snippet } from "@/components/ai-elements/snippet";

<Snippet prefix="$">npm install react</Snippet>
```

---

### Stack Trace

Formatted JavaScript error stack traces.

```tsx
import { StackTrace, StackTraceHeader, StackTraceFrames } from "@/components/ai-elements/stack-trace";

<StackTrace trace={error.stack} defaultOpen>
  <StackTraceHeader>
    <StackTraceErrorType />
    <StackTraceErrorMessage />
  </StackTraceHeader>
  <StackTraceFrames />
</StackTrace>
```

---

### Terminal

Terminal output display with ANSI colors.

```tsx
import { Terminal, TerminalLine } from "@/components/ai-elements/terminal";

<Terminal>
  <TerminalLine>$ npm install</TerminalLine>
  <TerminalLine>added 150 packages</TerminalLine>
</Terminal>
```

---

### Test Results

Test suite results with pass/fail/skip status.

```tsx
import { TestResults, TestResultItem } from "@/components/ai-elements/test-results";

<TestResults passed={10} failed={2} skipped={1} duration="3.25s">
  <TestResultItem name="should login" status="passed" duration={45} />
  <TestResultItem name="should reject invalid" status="failed" error={error} />
</TestResults>
```

---

### Web Preview

iframe preview for generated UI.

```tsx
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl } from "@/components/ai-elements/web-preview";

<WebPreview defaultUrl={previewUrl}>
  <WebPreviewNavigation>
    <WebPreviewUrl />
  </WebPreviewNavigation>
  <WebPreviewBody src={previewUrl} />
</WebPreview>
```

---

### Audio Player

Audio playback with waveform visualization.

```tsx
import { AudioPlayer, AudioPlayerWaveform } from "@/components/ai-elements/audio-player";

<AudioPlayer src="/audio/response.mp3" />
```

---

### Mic Selector

Dropdown for selecting microphone input device.

```tsx
import { MicSelector, MicSelectorTrigger, MicSelectorContent, MicSelectorItem } from "@/components/ai-elements/mic-selector";
import { useAudioDevices } from "@/components/ai-elements/mic-selector";

<MicSelector>
  <MicSelectorTrigger>Select microphone</MicSelectorTrigger>
  <MicSelectorContent>
    {devices.map((device) => (
      <MicSelectorItem key={device.deviceId} value={device.deviceId}>
        {device.label}
      </MicSelectorItem>
    ))}
  </MicSelectorContent>
</MicSelector>
```

---

### Persona

Animated AI avatar powered by Rive with state-based animations.

```tsx
import { Persona } from "@/components/ai-elements/persona";

<Persona state="listening" variant="opal" className="size-32" />
```

**States:** `idle`, `listening`, `thinking`, `speaking`, `asleep`
**Variants:** `obsidian`, `mana`, `opal`, `halo`, `glint`, `command`

---

### Speech Input

Voice capture button with Web Speech API and MediaRecorder fallback.

```tsx
import { SpeechInput } from "@/components/ai-elements/speech-input";

<SpeechInput
  onTranscriptionChange={(text) => setInput(text)}
  onAudioRecorded={handleAudioRecorded}
/>
```

---

### Transcription

Interactive transcript with click-to-seek.

```tsx
import { Transcription, TranscriptionSegment } from "@/components/ai-elements/transcription";

<Transcription segments={transcript.segments} currentTime={currentTime} onSeek={seekTo}>
  {(segment, index) => (
    <TranscriptionSegment key={index}>
      {segment.text}
    </TranscriptionSegment>
  )}
</Transcription>
```

---

### Voice Selector

Dialog for selecting AI voices with metadata.

```tsx
import { VoiceSelector, VoiceSelectorTrigger, VoiceSelectorContent, VoiceSelectorItem } from "@/components/ai-elements/voice-selector";

<VoiceSelector>
  <VoiceSelectorTrigger>Select voice</VoiceSelectorTrigger>
  <VoiceSelectorContent>
    <VoiceSelectorItem value="voice-1">Alloy</VoiceSelectorItem>
    <VoiceSelectorItem value="voice-2">Nova</VoiceSelectorItem>
  </VoiceSelectorContent>
</VoiceSelector>
```

---

### Canvas

React Flow canvas for node-based interfaces.

```tsx
import { Canvas } from "@/components/ai-elements/canvas";

<Canvas>
  <Node />
  <Edge />
</Canvas>
```

---

### Connection

Animated connection line for React Flow.

```tsx
import { Connection } from "@/components/ai-elements/connection";

<Connection fromX={0} fromY={0} toX={100} toY={100} />
```

---

### Controls

Zoom/pan controls for React Flow canvas.

```tsx
import { Controls } from "@/components/ai-elements/controls";

<Controls />
```

---

### Edge

Custom edge components for React Flow with animated and temporary variants.

```tsx
import { Edge } from "@/components/ai-elements/edge";

<Edge.Temporary />
<Edge.Animated />
```

---

### Node

Card-based node for React Flow canvases.

```tsx
import { Node, NodeHeader, NodeTitle, NodeContent, NodeAction } from "@/components/ai-elements/node";

<Node>
  <NodeHeader>
    <NodeTitle>Task</NodeTitle>
  </NodeHeader>
  <NodeContent>Description</NodeContent>
  <NodeAction>Run</NodeAction>
</Node>
```

---

### Panel

Positioned overlay panel for React Flow.

```tsx
import { Panel } from "@/components/ai-elements/panel";

<Panel position="top-right">
  <div>Panel content</div>
</Panel>
```

---

### Toolbar

Toolbar attached to React Flow nodes.

```tsx
import { Toolbar } from "@/components/ai-elements/toolbar";

<Toolbar>
  <button>Edit</button>
  <button>Delete</button>
</Toolbar>
```

---

### Image

Display AI-generated images from AI SDK.

```tsx
import { Image } from "@/components/ai-elements/image";

<Image {...imageData} alt="Generated image" />
```

---

### Open In Chat

Dropdown to open queries in other AI platforms.

```tsx
import { OpenIn, OpenInChatGPT, OpenInClaude } from "@/components/ai-elements/open-in-chat";

<OpenIn query="Explain React hooks">
  <OpenInChatGPT />
  <OpenInClaude />
</OpenIn>
```

**Supported:** ChatGPT, Claude, T3 Chat, Scira AI, v0, Cursor

---

## Usage with AI SDK

AI Elements components integrate deeply with AI SDK. Example with `useChat`:

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ai-elements/prompt-input";

export default function Chat() {
  const { messages, sendMessage, status } = useChat();

  return (
    <div className="h-screen flex flex-col">
      <Conversation>
        <ConversationContent>
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  }
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
      </Conversation>

      <PromptInput
        onSubmit={(message) => sendMessage({ text: message.text })}
        className="p-4"
      >
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputSubmit status={status} />
      </PromptInput>
    </div>
  );
}
```

---

## Troubleshooting

### Components not styled?

Ensure `globals.css` imports Tailwind and shadcn/ui base styles.

### Module not found?

Check `tsconfig.json` has `@/*` path alias:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Streamdown styles missing?

Add to `globals.css`:

```css
@source "../node_modules/streamdown/dist/*.js";
```

---

## Resources

- [Official Docs](https://elements.ai-sdk.dev)
- [GitHub](https://github.com/vercel/ai-elements)
- [AI SDK](https://ai-sdk.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

---

## Positioning

**Use when:** Building AI chat interfaces, message UIs, tool-rendering surfaces, code displays, voice interfaces, or node-based workflows.

**Do not use when:** You need runtime guidance for models, providers, or streaming APIs. Use `ai-sdk` for that.

**Pair with:** `ai-sdk` for the runtime layer that powers these UI components.

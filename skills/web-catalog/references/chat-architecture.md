# Chat Architecture

Complete architecture for the floating chat widget system.

## Components

### ChatWidget (`src/components/ui/chat-widget.tsx`)
Floating button that opens chat. Handles:
- FAB button with "online" indicator
- Mobile: Drawer (Radix UI) - full screen on mobile
- Desktop: ChatContainer - floating panel
- localStorage persistence for open/closed state

```tsx
// Mobile Drawer - only mounted when open
{isOpen && (
  <Drawer open={isOpen} onOpenChange={setIsOpen} modal={false}>
    <DrawerContent className="h-[85dvh]">
      <ChatContent onClose={() => setIsOpen(false)} />
    </DrawerContent>
  </Drawer>
)}

// Desktop Container - hidden on mobile
<ChatContainer open={isOpen} onOpenChange={setIsOpen} />
```

### ChatContainer (`src/components/ui/chat-container.tsx`)
Desktop floating panel with Framer Motion animations.

**Responsive sizing:**
- Base: `w-[calc(100vw-1rem)] max-w-[24rem] bottom-22`
- sm: `right-4 bottom-24 w-[min(22rem,calc(100vw-2rem))]`
- md: `right-5 bottom-25 w-[23rem]`
- lg: `right-6 bottom-26 w-[24rem]`
- xl: `w-[25rem] rounded-[2rem]`

### ChatContent (`src/components/ui/chat-content.tsx`)
Main chat interface with:
- Header with "Dr. Asistente" avatar and online status
- Scrollable message area with gradient fade
- Input with WhatsApp contact button
- Rate limit counter in footer
- Error state with retry button

### ChatBubble (`src/components/ui/chat-bubble.tsx`)
Individual messages with:
- User messages: right-aligned, primary color
- Assistant messages: left-aligned, muted background
- Loading state with animated dots

### ChatInput (`src/components/ui/chat-input.tsx`)
Input with:
- Enter to submit
- Disabled state during loading
- Character feedback

## useDrChat Hook (`src/hooks/use-chat.ts`)

Wraps `@ai-sdk/react` `useChat` with:

```typescript
const {
  messages,        // Normalized messages array
  input,          // Current input text
  setInput,       // Set input directly
  handleInputChange, // onChange handler
  handleSubmit,    // Submit with rate limit check
  isLoading,      // streaming || submitted
  error,          // Error message
  reload,         // Regenerate last response
  stop,           // Stop streaming
  rateLimit,      // { remaining, limit, resetTime, isLimited }
} = useDrChat();
```

### Persistence
- Key: `dr-yurivilca-chat`
- Version: `1` (for future migrations)
- Max messages: `50`
- Clears on version mismatch

### Rate Limit Sync
- Server: 10 req/min per IP (see `rate-limit.ts`)
- Client: localStorage mirror for UX feedback
- Counter resets on window expiration

## Streaming Flow

1. User types message and submits
2. `handleSubmit` checks local rate limit
3. `sendMessage({ text })` from useChat
4. POST to `/api/chat` with messages array
5. Server streams via `agent.stream()`
6. Client receives streaming response
7. Messages normalized via `getMessageText()`
8. UI updates via `status === "streaming"`

## Hydration Safety

ChatWidget reads localStorage AFTER hydration:

```tsx
const [isHydrated, setIsHydrated] = React.useState(false);

React.useEffect(() => {
  // Read after mount to avoid hydration mismatch
  const stored = localStorage.getItem(KEY) === "true";
  setIsOpen(stored);
  setIsHydrated(true);
}, []);

React.useEffect(() => {
  if (!isHydrated) return;
  localStorage.setItem(KEY, String(isOpen));
}, [isOpen, isHydrated]);
```

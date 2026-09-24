# Generative UI Pattern

Advanced UI composition examples that should pair with canonical runtime guidance from `ai-sdk` and UI companion guidance from `ai-elements`.

## Overview

Generative UI allows AI models to dynamically create and modify user interfaces by connecting tool calls to React components. This creates more engaging, context-aware experiences.

## Core Concept

1. AI model receives user input
2. Model decides to use tools based on context
3. Tools execute and return data
4. React components render the results
5. Users interact with generated UI

## Tool Definition

### Basic Tool Structure
```typescript
// lib/ai/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ location, units }) => {
    // Fetch real weather data
    const response = await fetch(
      `https://api.weather.com/v1/weather?q=${location}&units=${units}`
    );
    const data = await response.json();

    return {
      location,
      temperature: data.temperature,
      condition: data.condition,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
    };
  },
});
```

### Complex Tool with Async Operations
```typescript
export const flightSearchTool = tool({
  description: 'Search for flights between cities',
  parameters: z.object({
    from: z.string().describe('Departure city or airport code'),
    to: z.string().describe('Destination city or airport code'),
    date: z.string().describe('Departure date (YYYY-MM-DD)'),
    passengers: z.number().default(1),
  }),
  execute: async ({ from, to, date, passengers }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const flights = [
      {
        id: 'FL001',
        airline: 'SkyAir',
        departure: '08:00',
        arrival: '11:30',
        price: 299,
        seats: Math.floor(Math.random() * 50) + 1,
      },
      {
        id: 'FL002',
        airline: 'CloudWings',
        departure: '14:15',
        arrival: '17:45',
        price: 389,
        seats: Math.floor(Math.random() * 50) + 1,
      },
    ];

    return {
      from,
      to,
      date,
      flights,
      passengers,
    };
  },
});
```

## Server-Side Setup

### API Route with Tools
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { weatherTool, flightSearchTool } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    system: `You are a helpful assistant that can provide weather information
             and search for flights. Use tools when appropriate to help users.`,
    messages,
    tools: {
      weather: weatherTool,
      flightSearch: flightSearchTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Multiple Tool Types
```typescript
// Tools can return different data shapes
const tools = {
  // Data retrieval tool
  getData: tool({
    parameters: z.object({
      id: z.string(),
    }),
    execute: async ({ id }) => {
      return { id, data: 'Retrieved data' };
    },
  }),

  // Action tool
  createItem: tool({
    parameters: z.object({
      name: z.string(),
      type: z.string(),
    }),
    execute: async ({ name, type }) => {
      const item = await database.create({ name, type });
      return { success: true, item };
    },
  }),

  // UI generation tool
  generateUI: tool({
    parameters: z.object({
      component: z.string(),
      props: z.record(z.any()),
    }),
    execute: async ({ component, props }) => {
      return { component, props };
    },
  }),
};
```

## Client-Side Implementation

### Basic Chat with Tool Rendering
```typescript
// components/ai/ChatWithTools.tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { WeatherWidget } from './tool-ui/WeatherWidget';
import { FlightResults } from './tool-ui/FlightResults';

export default function ChatWithTools() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    toolInvocation: ({ toolCall }) => {
      // Render tool results based on tool name
      if (toolCall.toolName === 'weather') {
        return <WeatherWidget {...toolCall.result} />;
      }

      if (toolCall.toolName === 'flightSearch') {
        return <FlightResults {...toolCall.result} />;
      }

      return null;
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4 mb-4">
        {messages.map(m => (
          <Message key={m.id} message={m} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about weather or flights..."
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg">
          Send
        </button>
      </form>
    </div>
  );
}
```

### Message Component with Tool Support
```typescript
// components/ai/Message.tsx
interface MessageProps {
  message: any;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-lg p-3 rounded-lg ${
        isUser ? 'bg-blue-500 text-white' : 'bg-gray-100'
      }`}>
        {/* Text content */}
        {message.content && (
          <p className="mb-2">{message.content}</p>
        )}

        {/* Tool invocations and results */}
        {message.toolInvocations?.map(tool => (
          <div key={tool.toolCallId} className="mt-2">
            {tool.state === 'call' ? (
              <div className="flex items-center gap-2 text-sm">
                <Spinner size="sm" />
                <span>Calling {tool.toolName}...</span>
              </div>
            ) : tool.state === 'result' ? (
              <ToolResult tool={tool} />
            ) : tool.state === 'error' ? (
              <div className="text-red-500 text-sm">
                Error: {tool.error.message}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Tool Result Renderer
```typescript
// components/ai/ToolResult.tsx
interface ToolResultProps {
  tool: any;
}

export function ToolResult({ tool }: ToolResultProps) {
  const renderToolResult = () => {
    switch (tool.toolName) {
      case 'weather':
        return <WeatherWidget {...tool.result} />;

      case 'flightSearch':
        return <FlightResults {...tool.result} />;

      case 'createChart':
        return <ChartDisplay {...tool.result} />;

      default:
        return (
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium mb-1">{tool.toolName}</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(tool.result, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return <div className="mt-2">{renderToolResult()}</div>;
}
```

## Tool UI Components

### Weather Widget
```typescript
// components/ai/tool-ui/WeatherWidget.tsx
interface WeatherWidgetProps {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  units: 'celsius' | 'fahrenheit';
}

export function WeatherWidget({
  location,
  temperature,
  condition,
  humidity,
  windSpeed,
  units,
}: WeatherWidgetProps) {
  const tempSymbol = units === 'celsius' ? '°C' : '°F';

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-4 rounded-lg">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">{location}</h3>
          <p className="text-blue-100">{condition}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">
            {temperature}{tempSymbol}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4" />
          <span>Humidity: {humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4" />
          <span>Wind: {windSpeed} km/h</span>
        </div>
      </div>

      <button className="mt-3 w-full bg-white/20 hover:bg-white/30 transition-colors py-2 rounded text-sm">
        View Forecast
      </button>
    </div>
  );
}
```

### Flight Results
```typescript
// components/ai/tool-ui/FlightResults.tsx
interface FlightResultsProps {
  from: string;
  to: string;
  date: string;
  flights: Array<{
    id: string;
    airline: string;
    departure: string;
    arrival: string;
    price: number;
    seats: number;
  }>;
  passengers: number;
}

export function FlightResults({ from, to, date, flights, passengers }: FlightResultsProps) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-semibold">Flights from {from} to {to}</h3>
        <p className="text-sm text-gray-600">{date} • {passengers} passenger(s)</p>
      </div>

      <div className="divide-y">
        {flights.map(flight => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>

      <div className="p-3 bg-gray-50 text-center">
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View more flights →
        </button>
      </div>
    </div>
  );
}

function FlightCard({ flight }: { flight: any }) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium">{flight.airline}</div>
          <div className="text-sm text-gray-600">
            {flight.departure} - {flight.arrival}
          </div>
          <div className="text-xs text-green-600">
            {flight.seats} seats left
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold">${flight.price}</div>
          <button className="mt-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Advanced Patterns

### Nested Tools
```typescript
// Tool that calls other tools
const tripPlanningTool = tool({
  description: 'Plan a complete trip with flights, hotels, and activities',
  parameters: z.object({
    destination: z.string(),
    dates: z.object({
      start: z.string(),
      end: z.string(),
    }),
    preferences: z.array(z.string()).optional(),
  }),
  execute: async ({ destination, dates, preferences }) => {
    // Call flight tool
    const flights = await flightSearchTool.execute({
      from: 'current',
      to: destination,
      date: dates.start,
    });

    // Call hotel tool
    const hotels = await hotelSearchTool.execute({
      location: destination,
      checkin: dates.start,
      checkout: dates.end,
    });

    // Call activities tool
    const activities = await activitySearchTool.execute({
      location: destination,
      preferences,
    });

    return {
      destination,
      flights,
      hotels,
      activities,
    };
  },
});
```

### Dynamic Tool Loading
```typescript
// Load tools based on context
const getContextualTools = (context: string) => {
  const tools = {};

  if (context.includes('travel')) {
    tools.flightSearch = flightSearchTool;
    tools.hotelSearch = hotelSearchTool;
  }

  if (context.includes('weather')) {
    tools.weather = weatherTool;
  }

  return tools;
};
```

### Tool Composition
```typescript
// Combine multiple tools
const multiStepTool = tool({
  description: 'Execute multiple steps',
  parameters: z.object({
    steps: z.array(z.object({
      tool: z.string(),
      parameters: z.record(z.any()),
    })),
  }),
  execute: async ({ steps }) => {
    const results = [];

    for (const step of steps) {
      const tool = tools[step.tool];
      if (tool) {
        const result = await tool.execute(step.parameters);
        results.push({ step: step.tool, result });
      }
    }

    return { results };
  },
});
```

## Error Handling

### Tool Error Boundaries
```typescript
// Wrap tool results in error boundary
function SafeToolResult({ tool }: ToolResultProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 p-3 rounded">
          <p className="text-red-600">Tool failed to execute</p>
        </div>
      }
    >
      <ToolResult tool={tool} />
    </ErrorBoundary>
  );
}
```

### Tool Validation
```typescript
// Validate tool results before rendering
const validatedToolResult = (tool: any) => {
  try {
    // Validate result shape
    const validated = toolResultSchema.parse(tool.result);
    return { ...tool, result: validated };
  } catch (error) {
    console.error('Invalid tool result:', error);
    return { ...tool, error: 'Invalid result format' };
  }
};
```

## Best Practices

1. **Design tools for reusability** across different contexts
2. **Provide clear error states** for failed tool executions
3. **Add loading indicators** for long-running tools
4. **Validate tool parameters** before execution
5. **Cache results** when appropriate
6. **Make tool UI responsive** and accessible
7. **Handle edge cases** (empty results, network errors)
8. **Provide actions** within tool UI (refresh, select, etc.)

## Performance Optimization

### Lazy Load Tool UI
```typescript
const LazyToolUI = React.lazy(() => import('./ToolUI'));

// In component
<Suspense fallback={<Loading />}>
  <LazyToolUI tool={tool} />
</Suspense>
```

### Memoize Tool Components
```typescript
export const WeatherWidget = React.memo(function WeatherWidget(props) {
  // Component implementation
});
```

## Testing

### Mock Tools for Testing
```typescript
// test-utils/mockTools.ts
export const mockWeatherTool = {
  ...weatherTool,
  execute: async () => ({
    location: 'Test City',
    temperature: 22,
    condition: 'Sunny',
    humidity: 65,
    windSpeed: 10,
  }),
};
```

## When to Use Generative UI

- Interactive data exploration (weather, stocks, flights)
- Dynamic form generation
- Real-time data visualization
- Multi-step workflows
- Contextual actions based on user input
- Personalized content generation

## Anti-Patterns

- Don't overuse tools for simple text responses
- Avoid deeply nested tool calls (confusing UX)
- Don't create tools that return raw data without UI
- Avoid tools with too many parameters
- Don't forget to handle loading and error states
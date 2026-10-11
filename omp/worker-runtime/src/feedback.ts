import * as fs from 'node:fs';
import path from 'node:path';
import { atomicJson, invariant, jsonFile, object, text } from './common.ts';

export const MAX_MILESTONES = 128;
export const MAX_RESPONSE_CHARS = 16000;
type Entry = { seq: number; at: string; type: string; data: unknown };
export function requestFile(dir: string, requestId: string) {
  invariant(/^[A-Za-z0-9_-]{1,100}$/.test(requestId), 'INVALID_REQUEST_ID', 'Invalid request ID');
  return path.join(dir, 'requests', requestId + '.json');
}
export function readRequest(dir: string, requestId: string) {
  const file = requestFile(dir, requestId);
  invariant(fs.existsSync(file), 'NOT_FOUND', 'Request not found');
  return object(jsonFile(file));
}
export function patchRequest(dir: string, requestId: string, patch: Record<string, unknown>) {
  const result = { ...readRequest(dir, requestId), ...patch };
  atomicJson(requestFile(dir, requestId), result);
  return result;
}
export function recordMilestone(dir: string, requestId: string, entry: Entry) {
  const record = readRequest(dir, requestId);
  const milestones = Array.isArray(record.milestones) ? record.milestones : [];
  const dropped = Math.max(0, milestones.length + 1 - MAX_MILESTONES);
  patchRequest(dir, requestId, {
    milestones: [...milestones, entry].slice(-MAX_MILESTONES),
    milestonesDropped: Number(record.milestonesDropped || 0) + dropped,
  });
}

// Never serialize partial messages, raw thinking, tool arguments/results, or state
// dumps into default telemetry. The native session remains OMP's transcript source.
export function operationalFrame(frame: Record<string, unknown>): Record<string, unknown> | undefined {
  const type = String(frame.type);
  if (type === 'message_update' || type.endsWith('_delta') || type === 'tool_execution_update') return undefined;
  const result: Record<string, unknown> = {};
  const truncatedFields: string[] = [];
  function field(key: string, value: unknown, limit = 256) {
    if (typeof value !== 'string') return;
    result[key] = value.slice(0, limit);
    if (value.length > limit) truncatedFields.push(key);
  }
  field('type', type);
  for (const key of ['id','command','success','toolCallId','toolName','isError','method','reason','stopReason']) {
    const value = frame[key];
    if (typeof value === 'string') field(key, value);
    else if (typeof value === 'boolean') result[key] = value;
  }
  field('error', frame.error, 1000);
  if (type === 'message_start' || type === 'message_end') {
    const message = frame.message;
    if (message && typeof message === 'object') {
      const data = message as Record<string, unknown>;
      field('role', data.role);
      field('stopReason', data.stopReason);
      field('error', data.errorMessage, 1000);
    }
  }
  if (truncatedFields.length) result.truncatedFields = truncatedFields;
  return result;
}
export function assistantResponse(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const message = value as Record<string, unknown>;
  if (message.role !== 'assistant' || !Array.isArray(message.content)) return undefined;
  let output = '', originalChars = 0;
  for (const part of message.content) {
    if (!part || part.type !== 'text' || typeof part.text !== 'string') continue;
    originalChars += part.text.length;
    output += part.text.slice(0, Math.max(0, MAX_RESPONSE_CHARS - output.length));
  }
  if (!originalChars) return undefined;
  return { text: output, truncated: originalChars > output.length, originalChars, source: 'native-assistant-message' };
}
function summary(record: Record<string, unknown>) {
  const start = typeof record.startedAt === 'string' ? Date.parse(record.startedAt) : NaN;
  const end = typeof record.endedAt === 'string' ? Date.parse(record.endedAt) : NaN;
  return {
    requestId: record.requestId, rpcId: record.rpcId ?? null, rpcIds: record.rpcIds ?? null,
    assignmentRequestId: record.assignmentRequestId ?? null,
    command: record.command, delivery: record.state, assignmentState: record.assignmentState ?? 'unknown',
    sentAt: record.sentAt ?? null, acknowledgedAt: record.acknowledgedAt ?? null,
    startedAt: record.startedAt ?? null, endedAt: record.endedAt ?? null,
    observedExecutionMs: Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null,
    intervalMeaning: 'Observed first native agent_start to latest agent_end, including any queue/idle gaps; not verified task duration',
    interruptedAt: record.interruptedAt ?? null,
    role: record.role ?? null, model: record.model ?? null, thinking: record.thinking ?? null,
    configuration: record.configuration ?? null, configurationOutcome: record.configurationOutcome ?? null,
    observedConfiguration: record.observedConfiguration ?? null,
    milestones: record.milestones ?? [], milestonesGap: Number(record.milestonesDropped || 0) > 0,
    milestonesDropped: record.milestonesDropped ?? 0, suppressedUpdates: record.suppressedUpdates ?? null,
    suppressedUpdatesMeaning: 'Token/partial updates omitted from telemetry; count last flushed at a lifecycle milestone (crash tail may be unknown)',
    finalResponse: record.finalResponse ?? null, evidence: record.evidence ?? null, error: record.error ?? null,
    lifecycleKnown: record.feedbackVersion === 1,
    verification: 'not-performed', taskCompletion: 'not-asserted',
    note: 'Delivery/worker turn end and assistant claims are not verification, acceptance, or Climier done. Missing legacy observations remain unknown.',
  };
}
export function report(dir: string, requestId?: string) {
  if (requestId) return summary(readRequest(dir, requestId));
  const directory = path.join(dir, 'requests');
  const records = fs.existsSync(directory) ? fs.readdirSync(directory).filter(name => name.endsWith('.json')).map(name => object(jsonFile(path.join(directory, name)))) : [];
  const assignments = records.filter(record => record.command === 'prompt').sort((a,b) => String(a.at).localeCompare(String(b.at)));
  const summaries = assignments.slice(-20).map(record => {
    const detail = summary(record);
    return { ...detail, milestones: undefined, finalResponse: undefined, detailOmitted: true, finalResponseAvailable: !!record.finalResponse };
  });
  return { assignments: summaries, totalAssignments: assignments.length, omittedAssignments: Math.max(0, assignments.length - 20), note: 'Latest 20 assignment summaries; --request-id includes retained milestones and bounded final response.' };
}
export function trace(dir: string, requestId: string) {
  const record = readRequest(dir, requestId);
  return { requestId: text(record.requestId), rpcId: record.rpcId ?? null, milestones: record.milestones ?? [], gap: Number(record.milestonesDropped || 0) > 0, dropped: record.milestonesDropped ?? 0, legacyMissing: record.feedbackVersion !== 1, note: 'Ordered recorded operational milestones, not a chat transcript; raw thinking and token updates are not recorded.' };
}

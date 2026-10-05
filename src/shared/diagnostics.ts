import { accountChannels } from './account'
import { generationChannels } from './generation'
import { workspaceChannels } from './workspace'

// Internal telemetry only. No logging/filesystem API is exposed to the page.
export const rendererDiagnosticChannel = 'diagnostics:renderer-failure'
export const rendererDiagnosticMessage = 'learning-studio:renderer-failure'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'main' | 'renderer' | 'preload' | 'utility'
export type LogEvent = 'session.started' | 'app.ready' | 'app.stopping' | 'app.start-failed' |
  'window.created' | 'window.loaded' | 'window.closed' | 'window.load-failed' |
  'process.gone' | 'process.unhandled' | 'preload.failed' | 'renderer.error' | 'renderer.rejection' |
  'console.output' | 'ipc.started' | 'ipc.completed' | 'ipc.failed' | 'account.changed' |
  'workspace.changed' | 'generation.changed' | 'worker.started' | 'worker.spawned' |
  'worker.phase' | 'worker.completed' | 'worker.failed' | 'worker.exited' |
  'engine.materials' | 'engine.request' | 'engine.response' | 'engine.terminal' |
  'engine.tool' | 'engine.turn' | 'model.test' | 'logging.dropped'

const enumFields: Record<string, readonly string[]> = {
  channel: [...Object.values(accountChannels), ...Object.values(generationChannels), ...Object.values(workspaceChannels)],
  code: ['INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'INTERNAL', 'AUTH_REQUIRED', 'PLAN_PERMISSION_REQUIRED', 'ACCESS_RESTRICTED', 'USAGE_LIMIT', 'NETWORK', 'CANCELLED', 'BUSY', 'UNAVAILABLE', 'STORAGE', 'CONFLICT'],
  errorType: ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'URIError', 'EvalError', 'ApplicationError', 'AggregateError', 'unknown'],
  status: ['disconnected', 'connecting', 'connected', 'permission-required', 'reconnect-required', 'restricted', 'usage-limited', 'preparing', 'examining', 'planning', 'validating', 'saving', 'saved', 'needs-details', 'cancelled', 'failed', 'unsaved'],
  modelsStatus: ['idle', 'loading', 'ready', 'failed'],
  phase: ['examining', 'planning', 'validating'], kind: ['outline', 'needs-details'],
  availability: ['available', 'missing', 'unreadable'],
  reason: ['clean-exit', 'abnormal-exit', 'killed', 'crashed', 'oom', 'launch-failed', 'integrity-failure'],
  processType: ['Utility', 'GPU', 'Zygote', 'Sandbox helper', 'renderer', 'main'],
  origin: ['uncaughtException', 'unhandledRejection'],
  method: ['log', 'info', 'warn', 'error', 'debug', 'trace'],
  tool: ['list_materials', 'read_material', 'submit_outline', 'request_learning_details'],
  terminalEvent: ['response.completed', 'response.incomplete', 'response.failed', 'error'],
  requestedModel: ['gpt-6.1-sol', 'gpt-6-luna'],
  contentType: ['sse', 'json', 'other', 'missing'],
  responseStatus: ['completed', 'incomplete', 'failed', 'in_progress', 'queued', 'cancelled'],
  providerCode: ['invalid_grant', 'invalid_token', 'model_not_found', 'subscription_sharing_unsupported_capability', 'subscription_sharing_usage_limit_exceeded', 'subscription_sharing_usage_unavailable'],
  incompleteReason: ['max_output_tokens', 'content_filter'],
  outcome: ['network_error', 'http_error', 'stream_error', 'missing_body', 'invalid_event', 'response_too_large', 'missing_completion', 'incomplete_response', 'unexpected_status', 'model_mismatch', 'missing_output', 'verified', 'cancelled', 'timeout'],
  platform: ['win32', 'darwin', 'linux']
}
const numbers = new Set(['elapsedMs', 'exitCode', 'pid', 'windowId', 'line', 'column', 'arguments', 'omittedCharacters', 'projects', 'runs', 'files', 'readableFiles', 'turn', 'httpStatus', 'bytes', 'events', 'textDeltaEvents', 'completedEvents', 'dropped'])
const booleans = new Set(['hasStreamedText', 'hasFinalText', 'hasOutline', 'hasActiveProject', 'writable', 'rewriting', 'completed', 'blocked', 'packaged', 'development'])
const identifiers = new Set(['requestId', 'workerId', 'runId', 'projectId'])
const versions = new Set(['appVersion', 'electronVersion', 'nodeVersion', 'chromeVersion'])

/** Project safe scalar metadata, never recursively serialize arbitrary objects. */
export function safeLogData(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const output: Record<string, string | number | boolean | null> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue
    if (Object.hasOwn(enumFields, key)) output[key] = item === null ? null : typeof item === 'string' && enumFields[key]!.includes(item) ? item : 'unrecognized'
    else if (numbers.has(key) && typeof item === 'number' && Number.isFinite(item)) output[key] = item
    else if (booleans.has(key) && typeof item === 'boolean') output[key] = item
    else if (identifiers.has(key) && typeof item === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item)) output[key] = item
    else if (versions.has(key) && typeof item === 'string' && /^\d+(?:\.\d+){1,3}(?:-[a-z0-9.]+)?$/i.test(item)) output[key] = item
    else if (key === 'returnedModel') output[key] = item === null ? null : typeof item === 'string' && /^gpt-(?:5\.5|5\.6-(?:sol|terra|luna)|6(?:\.1)?-(?:sol|astra|luna))(?:-\d{4}-\d{2}-\d{2})?$/.test(item) ? item : 'unrecognized'
  }
  return output
}

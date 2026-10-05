import { rendererDiagnosticMessage, safeLogData } from '../../../shared/diagnostics'

// Page failures originate in this world. DOM messages cross context isolation;
// preload forwards only this fixed metadata shape to the authorized main collector.
window.addEventListener('error', event => window.postMessage({ type: rendererDiagnosticMessage,
  event: 'renderer.error', ...safeLogData({ errorType: event.error instanceof Error ? event.error.name : 'unknown', line: event.lineno, column: event.colno })
}, window.location.origin))
window.addEventListener('unhandledrejection', event => window.postMessage({ type: rendererDiagnosticMessage,
  event: 'renderer.rejection', ...safeLogData({ errorType: event.reason instanceof Error ? event.reason.name : 'unknown' })
}, window.location.origin))

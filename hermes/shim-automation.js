/**
 * Hermes has no ESM, so the live automation client's dynamic import() cannot parse.
 * The desktop app does not need that client.
 */
exports.App = class AutomationApp {}
exports.browserRendererAsTest = function () {
  return {}
}
exports.InProcessBackend = class InProcessBackend {}
exports.liveRendererAsTest = function () {
  return {}
}
exports.serveAutomationStdio = function () {}

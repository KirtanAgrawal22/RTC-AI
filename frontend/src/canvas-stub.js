/**
 * Stub for Node 'canvas' so Konva is not loaded on the server.
 * Konva's index-node.js requires('canvas') and uses DOMMatrix; this avoids the dependency.
 */
const noop = function () {};
module.exports = {
  default: { DOMMatrix: noop },
  DOMMatrix: noop,
};

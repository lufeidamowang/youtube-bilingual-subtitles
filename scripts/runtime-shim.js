import 'core-js/web/url.js';
import { TextEncoder, TextDecoder } from 'text-encoding';

if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder;

// Shadowrocket's native request/response wrappers expose non-enumerable fields.
// Return an ordinary object so the native completion bridge receives changes.
if (typeof globalThis.$rocket !== 'undefined' && typeof globalThis.$done === 'function') {
  const complete = globalThis.$done;
  const plainResult = value => {
    if (!value || typeof value !== 'object') return value;
    const result = {};
    for (const key of ['url', 'method', 'headers', 'body', 'bodyBytes', 'status', 'statusCode', 'response', 'policy', 'node', 'opts']) {
      if (value[key] !== undefined) result[key] = key === 'response' ? plainResult(value[key]) : value[key];
    }
    return result;
  };
  globalThis.$done = value => complete(plainResult(value));
}

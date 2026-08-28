import test from 'node:test';
import assert from 'node:assert/strict';
import { attachRequestId, requestContext } from '../worker/observability.js';

test('request context creates a stable request id', () => {
  const request = new Request('https://example.test/api/health', { headers: { 'X-Request-ID': 'client-request-123' } });
  const context = requestContext(request);
  assert.equal(context.id, 'client-request-123');
  assert.equal(context.path, '/api/health');
});

test('request id is attached to responses', async () => {
  const response = attachRequestId(new Response('ok'), 'trace-12345678');
  assert.equal(response.headers.get('X-Request-ID'), 'trace-12345678');
  assert.equal(await response.text(), 'ok');
});

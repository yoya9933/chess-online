import test from 'node:test';
import assert from 'node:assert/strict';
import { secureResponse, securityGate, TOKEN_PATTERN } from '../worker/security.js';

test('strong player token format accepts UUID and rejects short tokens', () => {
  assert.equal(TOKEN_PATTERN.test('123e4567-e89b-12d3-a456-426614174000'), true);
  assert.equal(TOKEN_PATTERN.test('short-token'), false);
});

test('security gate rejects API requests without player header', async () => {
  const request = new Request('https://example.test/api/rooms?room=ABC123');
  const response = await securityGate(request);
  assert.equal(response.status, 401);
});

test('security response adds browser hardening headers', () => {
  const response = secureResponse(new Response('ok'));
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  assert.match(response.headers.get('Content-Security-Policy') || '', /frame-ancestors 'none'/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, startTestServer } from './utils.ts';

test.describe('Lifecycle', () => {
  test('non existent route responds with 404 Not Found', async () => {
    const { dispatcher } = createTestApp([]);
    const { baseUrl, close } = await startTestServer(dispatcher);

    try {
      const res = await fetch(`${baseUrl}/non-existent-route`);
      const text = await res.text();

      assert.equal(res.status, 404);
      assert.match(text, /Not Found/);
    } finally {
      await close();
    }
  });
});

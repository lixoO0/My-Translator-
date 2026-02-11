import request from 'supertest';
import { createApp } from '../src/app';

test('GET /api/health returns 200', async () => {
  const app = await createApp();
  const response = await request(app).get('/api/health');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
});

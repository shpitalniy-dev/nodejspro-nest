import express from 'express';

import { SERVER_PORT } from './config/index.ts';

const app = express();

app.get('/health', async (_req, res) => {
  res.status(200).json({
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
  });
});

app.listen(SERVER_PORT, () => {
  console.log(`Server is running on port ${SERVER_PORT}`);
  console.log(`Health check: http://localhost:${SERVER_PORT}/health`);
});

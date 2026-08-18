import type http from 'http';

export const hasBody = (req: http.IncomingMessage): boolean => {
  const method = req.method?.toUpperCase() ?? '';

  return method === 'POST' || method === 'PUT' || method === 'PATCH';
};

export const parseBody = (
  req: http.IncomingMessage,
): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', reject);
  });

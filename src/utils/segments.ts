export const buildSegments = (prefix: string, route?: string): string[] =>
  [prefix, route].join('/').split('/').filter(Boolean);

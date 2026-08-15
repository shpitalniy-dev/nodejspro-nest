export const buildFullPath = (prefix: string, route?: string): string => {
  const fullPath = [prefix, route].filter(Boolean).join('/');

  return fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
};

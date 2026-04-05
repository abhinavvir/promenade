import { Hono } from 'hono';
import type { Handler } from 'hono/types';

const API_BASENAME = '/api';
const api = new Hono();

// Statically discovered at build time by Vite — works in serverless/bundled environments
const routeModules = import.meta.glob('../src/app/api/**/route.js', { eager: true });

function filePathToHonoPath(filePath: string): string {
  const relative = filePath
    .replace('../src/app/api', '')
    .replace(/\/route\.js$/, '');
  if (!relative) return '/';
  // Convert [...param] → :param{.+} and [param] → :param
  return relative
    .replace(/\[\.{3}([^\]]+)\]/g, ':$1{.+}')
    .replace(/\[([^\]]+)\]/g, ':$1');
}

for (const [filePath, mod] of Object.entries(routeModules)) {
  const honoPath = filePathToHonoPath(filePath) || '/';
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

  for (const method of methods) {
    if ((mod as any)[method]) {
      const handler: Handler = async (c) => {
        const params = c.req.param();
        return await (mod as any)[method](c.req.raw, { params });
      };
      switch (method) {
        case 'GET':    api.get(honoPath, handler);    break;
        case 'POST':   api.post(honoPath, handler);   break;
        case 'PUT':    api.put(honoPath, handler);    break;
        case 'DELETE': api.delete(honoPath, handler); break;
        case 'PATCH':  api.patch(honoPath, handler);  break;
      }
    }
  }
}

export { api, API_BASENAME };

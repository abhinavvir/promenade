import { AsyncLocalStorage } from 'node:async_hooks';
import nodeConsole from 'node:console';
import { skipCSRFCheck } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import { authHandler, initAuthConfig } from '@hono/auth-js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { hash, verify } from 'argon2';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { requestId } from 'hono/request-id';
import { createHonoVercelServer } from '@resolid/react-router-hono/vercel-server';
import { serializeError } from 'serialize-error';
import ws from 'ws';
import NeonAdapter from '../../__create/adapter';
import { getHTMLForErrorPage } from '../../__create/get-html-for-error-page';
import { isAuthAction } from '../../__create/is-auth-action';
import { API_BASENAME, api } from '../../__create/route-builder';

neonConfig.webSocketConstructor = ws;

const als = new AsyncLocalStorage<{ requestId: string }>();

for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = nodeConsole[method].bind(console);
  console[method] = (...args: unknown[]) => {
    const id = als.getStore()?.requestId;
    if (id) original(`[traceId:${id}]`, ...args);
    else original(...args);
  };
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = NeonAdapter(pool);

export default createHonoVercelServer({
  configure(app) {
    app.use('*', requestId());

    app.use('*', (c, next) => {
      const id = c.get('requestId');
      return als.run({ requestId: id }, () => next());
    });

    app.use(contextStorage());

    app.onError((err, c) => {
      if (c.req.method !== 'GET') {
        return c.json({ error: 'An error occurred in your app', details: serializeError(err) }, 500);
      }
      return c.html(getHTMLForErrorPage(err), 200);
    });

    if (process.env.CORS_ORIGINS) {
      app.use('/*', cors({
        origin: process.env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      }));
    }

    for (const method of ['post', 'put', 'patch'] as const) {
      app[method]('*', bodyLimit({
        maxSize: 4.5 * 1024 * 1024,
        onError: (c) => c.json({ error: 'Body size limit exceeded' }, 413),
      }));
    }

    if (process.env.AUTH_SECRET) {
      app.use('*', initAuthConfig((c) => ({
        secret: c.env.AUTH_SECRET,
        pages: { signIn: '/account/signin', signOut: '/account/logout' },
        skipCSRFCheck,
        session: { strategy: 'jwt' },
        callbacks: {
          session({ session, token }) {
            if (token.sub) session.user.id = token.sub;
            return session;
          },
        },
        cookies: {
          csrfToken: { options: { secure: true, sameSite: 'none' } },
          sessionToken: { options: { secure: true, sameSite: 'none' } },
          callbackUrl: { options: { secure: true, sameSite: 'none' } },
        },
        providers: [
          Credentials({
            id: 'credentials-signin',
            name: 'Credentials Sign in',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' },
            },
            authorize: async (credentials) => {
              const { email, password } = credentials;
              if (!email || !password) return null;
              if (typeof email !== 'string' || typeof password !== 'string') return null;
              const user = await adapter.getUserByEmail(email as string);
              if (!user) return null;
              const matchingAccount = user.accounts.find((a: any) => a.provider === 'credentials');
              if (!matchingAccount?.password) return null;
              const isValid = await verify(matchingAccount.password, password as string);
              if (!isValid) return null;
              return user;
            },
          }),
          Credentials({
            id: 'credentials-signup',
            name: 'Credentials Sign up',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' },
              name: { label: 'Name', type: 'text' },
              image: { label: 'Image', type: 'text', required: false },
            },
            authorize: async (credentials) => {
              const { email, password, name, image } = credentials;
              if (!email || !password) return null;
              if (typeof email !== 'string' || typeof password !== 'string') return null;
              const user = await adapter.getUserByEmail(email as string);
              if (user) return null;
              const newUser = await adapter.createUser({
                emailVerified: null,
                email: email as string,
                name: typeof name === 'string' && name.length > 0 ? name : undefined,
                image: typeof image === 'string' && image.length > 0 ? image : undefined,
              });
              await adapter.linkAccount({
                extraData: { password: await hash(password as string) },
                type: 'credentials',
                userId: newUser.id,
                providerAccountId: newUser.id,
                provider: 'credentials',
              });
              return newUser;
            },
          }),
        ],
      })));
    }

    app.use('/api/auth/*', async (c, next) => {
      if (isAuthAction(c.req.path)) return authHandler()(c, next);
      return next();
    });

    app.route(API_BASENAME, api);
  },
});

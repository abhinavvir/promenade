import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

export const auth = async () => {
  try {
    const c = getContext();
    const token = await getToken({
      req: c.req.raw,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL?.startsWith('https') ?? false,
    });
    if (token) {
      return {
        user: {
          id: token.sub,
          email: token.email,
          name: token.name,
          image: token.picture,
        },
        expires: String(token.exp),
      };
    }
  } catch {
    return null;
  }
};

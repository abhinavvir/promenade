import { SignJWT, jwtVerify } from 'jose';

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET env var is not set');
  return new TextEncoder().encode(s);
};

const EXPIRY = '30d';

/**
 * Signs a JWT for mobile app use.
 * @param {{ id: string|number, email: string, name: string, role: string, phoneNumber?: string }} user
 */
export async function signMobileJwt(user) {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    phoneNumber: user.phoneNumber ?? null,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret());
}

/**
 * Verifies a Bearer JWT from the Authorization header.
 * Returns the decoded payload or null if invalid/missing.
 * @param {Request} request
 */
export async function verifyMobileToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload; // { sub, email, name, role, phoneNumber, iat, exp }
  } catch {
    return null;
  }
}

/**
 * Gets the authenticated user from either Auth.js session or mobile Bearer token.
 * Returns { id, email, name, role, phoneNumber } or null.
 * @param {Request} request
 * @param {Function} auth - the Auth.js auth() function
 */
export async function getRequestUser(request, auth) {
  // Try session cookie first (web app)
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        phoneNumber: null,
      };
    }
  } catch {
    // auth() may throw if not in a Next/RR server context
  }

  // Fall back to Bearer token (mobile app)
  const payload = await verifyMobileToken(request);
  if (payload?.sub) {
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      phoneNumber: payload.phoneNumber ?? null,
    };
  }

  return null;
}

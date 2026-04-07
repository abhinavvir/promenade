import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

/**
 * Tests for the mobile-login route — specifically the bcrypt.compare fix.
 * We mock sql and signMobileJwt to keep tests fast and isolated.
 */

const mockSql = vi.fn();
const mockSignMobileJwt = vi.fn();

vi.mock('@/app/api/utils/sql', () => ({ default: mockSql }));
vi.mock('@/app/api/utils/mobile-auth', () => ({ signMobileJwt: mockSignMobileJwt }));

// Import after mocks are set up
const { POST } = await import('@/app/api/auth/mobile-login/route.js');

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/mobile-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const PLAINTEXT = 'secret123';

describe('POST /api/auth/mobile-login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when phone or password is missing', async () => {
    const res = await POST(makeRequest({ phone: '+15550001111' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/required/i);
  });

  it('returns 401 when phone is not found', async () => {
    mockSql.mockResolvedValueOnce([]); // first lookup
    mockSql.mockResolvedValueOnce([]); // normalized lookup
    const res = await POST(makeRequest({ phone: '+15550001111', password: PLAINTEXT }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash(PLAINTEXT, 10);
    mockSql.mockResolvedValueOnce([{ id: 1, email: 'a@b.com', name: 'Alice', role: 'manager', phone_number: '+15550001111' }]);
    mockSql.mockResolvedValueOnce([{ password: hash }]);
    const res = await POST(makeRequest({ phone: '+15550001111', password: 'wrongpassword' }));
    expect(res.status).toBe(401);
  });

  it('returns jwt when credentials are valid (bcrypt args in correct order)', async () => {
    const hash = await bcrypt.hash(PLAINTEXT, 10);
    mockSql.mockResolvedValueOnce([{ id: 1, email: 'a@b.com', name: 'Alice', role: 'manager', phone_number: '+15550001111' }]);
    mockSql.mockResolvedValueOnce([{ password: hash }]);
    mockSignMobileJwt.mockResolvedValueOnce('mock.jwt.token');

    const res = await POST(makeRequest({ phone: '+15550001111', password: PLAINTEXT }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jwt).toBe('mock.jwt.token');
    expect(data.user.email).toBe('a@b.com');
  });
});

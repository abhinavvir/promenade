import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests that all /api/admin/* endpoints require admin authentication.
 */

const mockSql = vi.fn();
const mockGetRequestUser = vi.fn();
const mockAuth = vi.fn();

vi.mock('@/app/api/utils/sql', () => ({ default: mockSql }));
vi.mock('@/app/api/utils/mobile-auth', () => ({ getRequestUser: mockGetRequestUser }));
vi.mock('@/auth', () => ({ auth: mockAuth }));

const { GET: getUsersGET, POST: usersGET, DELETE: usersDELETE, PATCH: usersPATCH } =
  await import('@/app/api/admin/users/route.js');
const { POST: makeAdminPOST } = await import('@/app/api/admin/make-admin/route.js');
const { GET: reportsGET } = await import('@/app/api/admin/reports/route.js');
const { GET: logsGET } = await import('@/app/api/admin/signin-logs/route.js');

function makeRequest(method = 'GET', body?: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Admin API auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when unauthenticated', () => {
    beforeEach(() => {
      mockGetRequestUser.mockResolvedValue(null);
    });

    it('GET /api/admin/users returns 401', async () => {
      const res = await getUsersGET(makeRequest());
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/users returns 401', async () => {
      const res = await usersGET(makeRequest('POST', { name: 'Test', phoneNumber: '+1' }));
      expect(res.status).toBe(401);
    });

    it('DELETE /api/admin/users returns 401', async () => {
      const res = await usersDELETE(makeRequest('DELETE'));
      expect(res.status).toBe(401);
    });

    it('PATCH /api/admin/users returns 401', async () => {
      const res = await usersPATCH(makeRequest('PATCH', { userId: 1 }));
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/make-admin returns 401', async () => {
      const res = await makeAdminPOST(makeRequest('POST', { email: 'x@y.com' }));
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/reports returns 401', async () => {
      const res = await reportsGET(makeRequest());
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/signin-logs returns 401', async () => {
      const res = await logsGET(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  describe('when authenticated as non-admin (manager)', () => {
    beforeEach(() => {
      mockGetRequestUser.mockResolvedValue({ id: '2', email: 'mgr@test.com', role: 'manager' });
    });

    it('GET /api/admin/users returns 403', async () => {
      const res = await getUsersGET(makeRequest());
      expect(res.status).toBe(403);
    });

    it('POST /api/admin/make-admin returns 403', async () => {
      const res = await makeAdminPOST(makeRequest('POST', { email: 'x@y.com' }));
      expect(res.status).toBe(403);
    });

    it('GET /api/admin/reports returns 403', async () => {
      const res = await reportsGET(makeRequest());
      expect(res.status).toBe(403);
    });

    it('GET /api/admin/signin-logs returns 403', async () => {
      const res = await logsGET(makeRequest());
      expect(res.status).toBe(403);
    });
  });

  describe('when authenticated as admin', () => {
    beforeEach(() => {
      mockGetRequestUser.mockResolvedValue({ id: '1', email: 'admin@test.com', role: 'admin' });
      // Mock sql to return empty results so handlers don't throw
      mockSql.mockResolvedValue([]);
    });

    it('GET /api/admin/users reaches handler (returns 200)', async () => {
      const res = await getUsersGET(makeRequest());
      expect(res.status).toBe(200);
    });

    it('GET /api/admin/reports returns 400 without date params (not 401/403)', async () => {
      const res = await reportsGET(makeRequest());
      // 400 = reached handler, not blocked by auth
      expect(res.status).toBe(400);
    });

    it('GET /api/admin/signin-logs reaches handler', async () => {
      mockSql.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: '0' }]);
      const res = await logsGET(makeRequest());
      expect(res.status).toBe(200);
    });
  });
});

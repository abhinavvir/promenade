import { Hono } from 'hono';
import type { Handler } from 'hono/types';

import * as r_admin_make_admin from '../src/app/api/admin/make-admin/route.js';
import * as r_admin_reports from '../src/app/api/admin/reports/route.js';
import * as r_admin_signin_logs from '../src/app/api/admin/signin-logs/route.js';
import * as r_admin_users from '../src/app/api/admin/users/route.js';
import * as r_assign_property from '../src/app/api/assign-property/route.js';
import * as r_audit_log from '../src/app/api/audit/log/route.js';
import * as r_auth_change_password from '../src/app/api/auth/change-password/route.js';
import * as r_auth_check_location from '../src/app/api/auth/check-location/route.js';
import * as r_auth_me from '../src/app/api/auth/me/route.js';
import * as r_auth_mobile_login from '../src/app/api/auth/mobile-login/route.js';
import * as r_auth_phone_signin from '../src/app/api/auth/phone-signin/route.js';
import * as r_auth_request_password_reset from '../src/app/api/auth/request-password-reset/route.js';
import * as r_auth_reset_password from '../src/app/api/auth/reset-password/route.js';
import * as r_auth_token from '../src/app/api/auth/token/route.js';
import * as r_checkin from '../src/app/api/checkin/route.js';
import * as r_checkin_status from '../src/app/api/checkin/status/route.js';
import * as r_checkout from '../src/app/api/checkout/route.js';
import * as r_location_verify from '../src/app/api/location/verify/route.js';
import * as r_properties from '../src/app/api/properties/route.js';
import * as r_properties_my from '../src/app/api/properties/my/route.js';
import * as r_requests from '../src/app/api/requests/route.js';
import * as r_requests_id from '../src/app/api/requests/[id]/route.js';
import * as r_setup from '../src/app/api/setup/route.js';

const API_BASENAME = '/api';
const api = new Hono();

const routes: Array<{ path: string; mod: Record<string, any> }> = [
  { path: '/admin/make-admin', mod: r_admin_make_admin },
  { path: '/admin/reports', mod: r_admin_reports },
  { path: '/admin/signin-logs', mod: r_admin_signin_logs },
  { path: '/admin/users', mod: r_admin_users },
  { path: '/admin/users/:id', mod: r_admin_users },
  { path: '/assign-property', mod: r_assign_property },
  { path: '/audit/log', mod: r_audit_log },
  { path: '/auth/change-password', mod: r_auth_change_password },
  { path: '/auth/check-location', mod: r_auth_check_location },
  { path: '/auth/me', mod: r_auth_me },
  { path: '/auth/mobile-login', mod: r_auth_mobile_login },
  { path: '/auth/phone-signin', mod: r_auth_phone_signin },
  { path: '/auth/request-password-reset', mod: r_auth_request_password_reset },
  { path: '/auth/reset-password', mod: r_auth_reset_password },
  { path: '/auth/token', mod: r_auth_token },
  { path: '/checkin', mod: r_checkin },
  { path: '/checkin/status', mod: r_checkin_status },
  { path: '/checkout', mod: r_checkout },
  { path: '/location/verify', mod: r_location_verify },
  { path: '/properties', mod: r_properties },
  { path: '/properties/my', mod: r_properties_my },
  { path: '/requests', mod: r_requests },
  { path: '/requests/:id', mod: r_requests_id },
  { path: '/setup', mod: r_setup },
];

for (const { path, mod } of routes) {
  const handler = (method: string): Handler => async (c) => {
    const params = c.req.param();
    return await mod[method](c.req.raw, { params });
  };
  if (mod.GET)    api.get(path,    handler('GET'));
  if (mod.POST)   api.post(path,   handler('POST'));
  if (mod.PUT)    api.put(path,    handler('PUT'));
  if (mod.DELETE) api.delete(path, handler('DELETE'));
  if (mod.PATCH)  api.patch(path,  handler('PATCH'));
}

export { api, API_BASENAME };

import bcrypt from "bcryptjs";
import sql from "@/app/api/utils/sql";

/**
 * One-time setup endpoint.
 * Creates the first admin account only if no admins exist yet.
 * Permanently locks after any admin is created.
 */

export async function GET() {
  const result = await sql`SELECT COUNT(*) AS count FROM auth_users WHERE role = 'admin'`;
  const adminCount = parseInt(result[0].count);
  return Response.json({ needsSetup: adminCount === 0 });
}

export async function POST(request) {
  // Re-check every time so this can never be exploited after setup
  const check = await sql`SELECT COUNT(*) AS count FROM auth_users WHERE role = 'admin'`;
  if (parseInt(check[0].count) > 0) {
    return Response.json({ error: "Setup already complete." }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, password } = body;

  if (!name || !phone || !password) {
    return Response.json({ error: "Name, phone, and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  const [user] = await sql`
    INSERT INTO auth_users (name, phone_number, role, created_via)
    VALUES (${name}, ${phone}, 'admin', 'setup')
    RETURNING id
  `;

  await sql`
    INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password, is_temporary_password)
    VALUES (${user.id}, 'credentials', 'credentials', ${phone}, ${hash}, false)
  `;

  return Response.json({ success: true });
}

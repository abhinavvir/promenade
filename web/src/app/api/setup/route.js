import bcrypt from "bcryptjs";
import sql from "@/app/api/utils/sql";

async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS auth_users (
      id            SERIAL PRIMARY KEY,
      name          TEXT,
      email         TEXT UNIQUE,
      phone_number  TEXT UNIQUE,
      role          TEXT NOT NULL DEFAULT 'manager',
      created_via   TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auth_accounts (
      id                    SERIAL PRIMARY KEY,
      "userId"              INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      provider              TEXT NOT NULL DEFAULT 'credentials',
      type                  TEXT NOT NULL DEFAULT 'credentials',
      "providerAccountId"   TEXT NOT NULL,
      password              TEXT,
      is_temporary_password BOOLEAN DEFAULT TRUE,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id             SERIAL PRIMARY KEY,
      "userId"       INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      session_token  TEXT UNIQUE NOT NULL,
      expires        TIMESTAMPTZ NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS properties (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      address     TEXT,
      latitude    NUMERIC(10, 7),
      longitude   NUMERIC(10, 7),
      manager_id  INTEGER REFERENCES auth_users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS check_ins (
      id                   SERIAL PRIMARY KEY,
      user_id              INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      property_id          INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      check_in_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      check_out_time       TIMESTAMPTZ,
      check_in_latitude    NUMERIC(10, 7),
      check_in_longitude   NUMERIC(10, 7),
      check_out_latitude   NUMERIC(10, 7),
      check_out_longitude  NUMERIC(10, 7),
      check_in_status      TEXT NOT NULL DEFAULT 'checked_in',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id                     SERIAL PRIMARY KEY,
      user_id                INTEGER REFERENCES auth_users(id) ON DELETE SET NULL,
      property_id            INTEGER REFERENCES properties(id) ON DELETE SET NULL,
      action                 TEXT NOT NULL,
      sign_in_status         TEXT,
      latitude               NUMERIC(10, 7),
      longitude              NUMERIC(10, 7),
      distance_from_property NUMERIC(10, 2),
      ip_address             TEXT,
      user_agent             TEXT,
      device_info            JSONB,
      details                JSONB,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         SERIAL PRIMARY KEY,
      token      TEXT UNIQUE NOT NULL,
      user_id    INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_requests (
      id           SERIAL PRIMARY KEY,
      property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      tenant_name  TEXT,
      tenant_email TEXT,
      request_type TEXT,
      priority     TEXT DEFAULT 'medium',
      title        TEXT NOT NULL,
      description  TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS property_managers (
      id          SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(property_id, user_id)
    )
  `;
}

export async function GET() {
  try {
    await initSchema();
    const result = await sql`SELECT COUNT(*) AS count FROM auth_users WHERE role = 'admin'`;
    const adminCount = parseInt(result[0].count);
    return Response.json({ needsSetup: adminCount === 0 });
  } catch (err) {
    console.error("Setup GET error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await initSchema();

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
  } catch (err) {
    console.error("Setup POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

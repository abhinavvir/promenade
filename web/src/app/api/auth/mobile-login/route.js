import sql from "@/app/api/utils/sql";
import { signMobileJwt } from "@/app/api/utils/mobile-auth";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/mobile-login
 * Body: { phone: string, password: string }
 * Returns: { jwt: string, user: { id, email, name, role, phoneNumber } }
 *
 * Used exclusively by the mobile app. Returns a signed JWT that the
 * app stores in SecureStore and sends as Authorization: Bearer <jwt>.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return Response.json(
        { error: "Phone number and password are required" },
        { status: 400 },
      );
    }

    // Look up user by phone number (try exact then normalized)
    let users = await sql`
      SELECT u.id, u.email, u.name, u.role, u.phone_number
      FROM auth_users u
      WHERE u.phone_number = ${phone.trim()}
      LIMIT 1
    `;

    if (users.length === 0) {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
      users = await sql`
        SELECT u.id, u.email, u.name, u.role, u.phone_number
        FROM auth_users u
        WHERE REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = ${cleanPhone}
        LIMIT 1
      `;
    }

    if (users.length === 0) {
      return Response.json(
        { error: "Invalid phone number or password" },
        { status: 401 },
      );
    }

    const user = users[0];

    // Fetch hashed password from auth_accounts
    const accounts = await sql`
      SELECT password
      FROM auth_accounts
      WHERE "userId" = ${user.id} AND provider = 'credentials'
      LIMIT 1
    `;

    if (accounts.length === 0) {
      return Response.json(
        { error: "Invalid phone number or password" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(accounts[0].password, password);
    if (!isValid) {
      return Response.json(
        { error: "Invalid phone number or password" },
        { status: 401 },
      );
    }

    const jwt = await signMobileJwt({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phone_number,
    });

    return Response.json({
      jwt,
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phone_number,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/mobile-login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { getRequestUser } from "@/app/api/utils/mobile-auth";

export async function POST(request) {
  try {
    const user = await getRequestUser(request, auth);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const accounts = await sql`
      SELECT id, password, is_temporary_password
      FROM auth_accounts
      WHERE "userId" = ${user.id} AND provider = 'credentials'
      LIMIT 1
    `;

    if (accounts.length === 0) {
      return Response.json(
        { error: "No credentials account found" },
        { status: 404 },
      );
    }

    const account = accounts[0];

    const isValid = await bcrypt.compare(account.password, currentPassword);
    if (!isValid) {
      return Response.json(
        { error: "Current password is incorrect" },
        { status: 403 },
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await sql`
      UPDATE auth_accounts
      SET password = ${hashedNewPassword}, is_temporary_password = false
      WHERE id = ${account.id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = await getRequestUser(request, auth);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await sql`
      SELECT is_temporary_password
      FROM auth_accounts
      WHERE "userId" = ${user.id} AND provider = 'credentials'
      LIMIT 1
    `;

    if (accounts.length === 0) {
      return Response.json({ isTemporary: false });
    }

    return Response.json({
      isTemporary: accounts[0].is_temporary_password === true,
    });
  } catch (error) {
    console.error("Error checking password status:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

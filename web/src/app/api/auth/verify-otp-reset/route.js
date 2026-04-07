import sql from "@/app/api/utils/sql";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/verify-otp-reset
 * Body: { phone: string, otp: string, newPassword: string }
 *
 * Verifies the OTP and resets the user's password.
 */
export async function POST(request) {
  try {
    const { phone, otp, newPassword } = await request.json();

    if (!phone || !otp || !newPassword) {
      return Response.json(
        { error: "Phone, OTP, and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Find user by phone number
    const users = await sql`
      SELECT id, phone_number, name
      FROM auth_users
      WHERE phone_number = ${normalizedPhone}
         OR REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = ${normalizedPhone.replace(/[^0-9]/g, "")}
      LIMIT 1
    `;

    if (users.length === 0) {
      return Response.json(
        { error: "No account found with this phone number" },
        { status: 404 },
      );
    }

    const user = users[0];

    // Find valid OTP token
    const token = `otp_${otp}`;
    const tokens = await sql`
      SELECT * FROM password_reset_tokens
      WHERE token = ${token}
        AND user_id = ${user.id}
        AND used = false
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (tokens.length === 0) {
      return Response.json(
        { error: "Invalid or expired OTP" },
        { status: 400 },
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password and mark token as used in a transaction
    await sql.transaction([
      sql`
        UPDATE auth_accounts
        SET password = ${hashedPassword}
        WHERE "userId" = ${user.id} AND type = 'credentials'
      `,
      sql`
        UPDATE password_reset_tokens
        SET used = true
        WHERE token = ${token}
      `,
    ]);

    console.log(`Password reset successful for user ID: ${user.id} via OTP`);

    return Response.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Verify OTP reset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

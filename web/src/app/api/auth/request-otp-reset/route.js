import sql from "@/app/api/utils/sql";
import crypto from "crypto";

/**
 * POST /api/auth/request-otp-reset
 * Body: { phone: string }
 *
 * Generates a 6-digit OTP and stores it in password_reset_tokens table.
 * In production, this would send the OTP via SMS.
 * For development, the OTP is logged to console.
 */
export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return Response.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Find user by phone number
    const users = await sql`
      SELECT id, phone_number, name
      FROM auth_users
      WHERE phone_number = ${normalizedPhone}
         OR REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = ${normalizedPhone.replace(/[^0-9]/g, "")}
      LIMIT 1
    `;

    // Always return success to prevent phone enumeration
    if (users.length === 0) {
      console.log(`Password reset requested for non-existent phone: ${phone}`);
      // Generate a fake OTP to prevent timing attacks
      const fakeOtp = crypto.randomInt(100000, 999999).toString();
      console.log(`[DEV MODE] Fake OTP for ${phone}: ${fakeOtp}`);
      return Response.json({
        message: "If an account exists with this phone number, you will receive an OTP shortly.",
        devMode: true,
      });
    }

    const user = users[0];

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Store OTP in password_reset_tokens table (reusing existing table)
    // Use 'otp' as a special prefix to distinguish from email tokens
    const token = `otp_${otp}`;

    // Delete any existing unused OTPs for this user
    await sql`
      DELETE FROM password_reset_tokens
      WHERE user_id = ${user.id}
        AND token LIKE 'otp_%'
        AND used = false
    `;

    // Store new OTP
    await sql`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (${token}, ${user.id}, ${expiresAt})
    `;

    // In production, send OTP via SMS here
    // For development, log to console
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`📱 PASSWORD RESET OTP`);
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`Phone: ${user.phone_number}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log(`═══════════════════════════════════════════════════`);

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // Example Twilio integration:
    // await sendSms({
    //   to: user.phone_number,
    //   message: `Your Promenade password reset OTP is: ${otp}. Valid for 15 minutes.`,
    // });

    return Response.json({
      message: "If an account exists with this phone number, you will receive an OTP shortly.",
      devMode: true,
      // Only include OTP in development for testing
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
    });
  } catch (error) {
    console.error("Request OTP reset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

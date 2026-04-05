import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/app/api/utils/send-email";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const users = await sql`
      SELECT id, email, name
      FROM auth_users
      WHERE email = ${email}
      LIMIT 1
    `;

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return Response.json({
        message:
          "If an account exists with this email, you will receive a password reset link shortly.",
      });
    }

    const user = users[0];

    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store token in database
    await sql`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (${token}, ${user.id}, ${expiresAt})
    `;

    // Generate reset link
    const resetLink = `${process.env.APP_URL}/account/reset-password?token=${token}`;

    // Send email with reset link
    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #357AFF;">Reset Your Password</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #357AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
              ${resetLink}
            </p>
            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
        `,
        text: `Reset your password by visiting: ${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, you can safely ignore this email.`,
      });

      console.log(`Password reset email sent to: ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return Response.json(
        {
          error:
            "Failed to send reset email. Please make sure you have added your RESEND_API_KEY in the project settings.",
        },
        { status: 500 },
      );
    }

    return Response.json({
      message:
        "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

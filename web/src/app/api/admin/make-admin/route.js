import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getRequestUser } from "@/app/api/utils/mobile-auth";

export async function POST(request) {
  const requestUser = await getRequestUser(request, auth);
  if (!requestUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (requestUser.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Update user to admin role
    const result = await sql`
      UPDATE auth_users 
      SET role = 'admin'
      WHERE email = ${email}
      RETURNING id, email, name, role
    `;

    if (result.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: result[0],
      message: `User ${email} is now an admin!`,
    });
  } catch (error) {
    console.error("Error making user admin:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

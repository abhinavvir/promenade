import sql from "@/app/api/utils/sql";

export async function POST(request) {
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

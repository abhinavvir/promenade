import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getRequestUser } from "@/app/api/utils/mobile-auth";

export async function GET(request) {
  try {
    const user = await getRequestUser(request, auth);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, name, email, phone_number, role
      FROM auth_users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user: rows[0] });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Use junction table (many-to-many); fall back to manager_id for old records
    const properties = await sql`
      SELECT DISTINCT p.id, p.name, p.address, p.latitude, p.longitude
      FROM properties p
      LEFT JOIN property_managers pm ON pm.property_id = p.id
      WHERE pm.user_id = ${userId} OR p.manager_id = ${userId}
      ORDER BY p.name ASC
    `;

    return Response.json({ properties });
  } catch (error) {
    console.error("GET /api/properties/my error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

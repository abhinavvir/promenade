import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    const properties = await sql`
      SELECT id, name, address, latitude, longitude
      FROM properties
      WHERE manager_id = ${userId}
      ORDER BY name ASC
    `;

    return Response.json({ properties });
  } catch (error) {
    console.error("GET /api/properties/my error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

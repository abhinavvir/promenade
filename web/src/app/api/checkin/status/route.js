import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Get the most recent active check-in for this user
    const rows = await sql`
      SELECT 
        ci.id,
        ci.user_id,
        ci.property_id,
        ci.check_in_time,
        ci.check_in_status,
        ci.check_in_latitude,
        ci.check_in_longitude,
        p.name AS property_name,
        p.address AS property_address
      FROM check_ins ci
      LEFT JOIN properties p ON ci.property_id = p.id
      WHERE ci.user_id = ${userId}
        AND ci.check_in_status = 'checked_in'
      ORDER BY ci.check_in_time DESC
      LIMIT 1
    `;

    if (rows.length > 0) {
      return Response.json({
        isCheckedIn: true,
        checkIn: rows[0],
      });
    }

    return Response.json({ isCheckedIn: false, checkIn: null });
  } catch (error) {
    console.error("GET /api/checkin/status error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

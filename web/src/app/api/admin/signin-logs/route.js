import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId");
    const propertyId = searchParams.get("propertyId");

    // Build query with filters
    let whereConditions =
      "WHERE a.action IN ('sign_in_attempt', 'location_verification', 'check_in', 'check_out')";
    const params = [];

    if (userId) {
      whereConditions += ` AND a.user_id = $${params.length + 1}`;
      params.push(parseInt(userId));
    }

    if (propertyId) {
      whereConditions += ` AND a.property_id = $${params.length + 1}`;
      params.push(parseInt(propertyId));
    }

    const logs = await sql(
      `
      SELECT 
        a.id,
        a.user_id,
        a.property_id,
        a.action,
        a.sign_in_status,
        a.latitude,
        a.longitude,
        a.distance_from_property,
        a.ip_address,
        a.user_agent,
        a.device_info,
        a.created_at,
        u.name as user_name,
        u.phone_number,
        u.email,
        p.name as property_name,
        p.address as property_address
      FROM audit_logs a
      LEFT JOIN auth_users u ON a.user_id = u.id
      LEFT JOIN properties p ON a.property_id = p.id
      ${whereConditions}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
      [...params, limit, offset],
    );

    // Get total count
    const countResult = await sql(
      `
      SELECT COUNT(*) as total
      FROM audit_logs a
      ${whereConditions}
    `,
      params,
    );

    return Response.json({
      logs,
      total: parseInt(countResult[0].total),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching sign-in logs:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

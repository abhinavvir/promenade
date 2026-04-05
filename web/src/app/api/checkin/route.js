import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, propertyId, latitude, longitude } = body;

    if (!userId || !propertyId) {
      return Response.json(
        { error: "User ID and property ID required" },
        { status: 400 },
      );
    }

    // Check if user already has an active check-in
    const existing = await sql`
      SELECT id FROM check_ins
      WHERE user_id = ${userId} AND check_in_status = 'checked_in'
      LIMIT 1
    `;

    if (existing.length > 0) {
      return Response.json(
        { error: "User is already checked in. Please check out first." },
        { status: 400 },
      );
    }

    // Create the check-in record
    const result = await sql`
      INSERT INTO check_ins (
        user_id,
        property_id,
        check_in_time,
        check_in_latitude,
        check_in_longitude,
        check_in_status
      )
      VALUES (
        ${userId},
        ${propertyId},
        NOW(),
        ${latitude || null},
        ${longitude || null},
        'checked_in'
      )
      RETURNING id, user_id, property_id, check_in_time, check_in_status
    `;

    // Also log in audit_logs
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await sql`
      INSERT INTO audit_logs (
        user_id,
        property_id,
        action,
        sign_in_status,
        latitude,
        longitude,
        ip_address,
        user_agent,
        details
      )
      VALUES (
        ${userId},
        ${propertyId},
        'check_in',
        'success',
        ${latitude || null},
        ${longitude || null},
        ${ip},
        ${userAgent},
        ${JSON.stringify({ checkInId: result[0].id, timestamp: new Date().toISOString() })}
      )
    `;

    return Response.json({ success: true, checkIn: result[0] });
  } catch (error) {
    console.error("POST /api/checkin error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

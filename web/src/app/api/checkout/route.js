import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getRequestUser } from "@/app/api/utils/mobile-auth";

export async function POST(request) {
  const requestUser = await getRequestUser(request, auth);
  if (!requestUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { latitude, longitude } = body;
    // Always use the authenticated user's ID — never trust userId from body
    const userId = requestUser.id;

    // Find the active check-in
    const activeCheckIn = await sql`
      SELECT id, property_id, check_in_time
      FROM check_ins
      WHERE user_id = ${userId} AND check_in_status = 'checked_in'
      ORDER BY check_in_time DESC
      LIMIT 1
    `;

    if (activeCheckIn.length === 0) {
      return Response.json(
        { error: "No active check-in found for this user." },
        { status: 400 },
      );
    }

    const checkInRecord = activeCheckIn[0];

    const checkOutTime = new Date();
    const checkInTime = new Date(checkInRecord.check_in_time);
    const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);
    const durationHours = parseFloat((durationMinutes / 60).toFixed(2));

    // Update the check-in record with checkout info
    const result = await sql`
      UPDATE check_ins
      SET
        check_out_time = ${checkOutTime.toISOString()},
        check_out_latitude = ${latitude || null},
        check_out_longitude = ${longitude || null},
        check_in_status = 'checked_out'
      WHERE id = ${checkInRecord.id}
      RETURNING id, user_id, property_id, check_in_time, check_out_time, check_in_status
    `;

    // Log in audit_logs
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
        ${checkInRecord.property_id},
        'check_out',
        'success',
        ${latitude || null},
        ${longitude || null},
        ${ip},
        ${userAgent},
        ${JSON.stringify({
          checkInId: checkInRecord.id,
          checkInTime: checkInRecord.check_in_time,
          checkOutTime: checkOutTime.toISOString(),
          durationMinutes,
          durationHours,
        })}
      )
    `;

    return Response.json({ success: true, checkOut: result[0] });
  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

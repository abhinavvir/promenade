import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getRequestUser } from "@/app/api/utils/mobile-auth";

export async function GET(request) {
  const requestUser = await getRequestUser(request, auth);
  if (!requestUser) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (requestUser.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("userId");
    const propertyId = searchParams.get("propertyId");

    const logs = await sql`
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
      WHERE a.action IN ('sign_in_attempt', 'location_verification', 'check_in', 'check_out')
      ${userId ? sql`AND a.user_id = ${parseInt(userId)}` : sql``}
      ${propertyId ? sql`AND a.property_id = ${parseInt(propertyId)}` : sql``}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM audit_logs a
      WHERE a.action IN ('sign_in_attempt', 'location_verification', 'check_in', 'check_out')
      ${userId ? sql`AND a.user_id = ${parseInt(userId)}` : sql``}
      ${propertyId ? sql`AND a.property_id = ${parseInt(propertyId)}` : sql``}
    `;

    return Response.json({
      logs,
      total: parseInt(countResult[0]?.total ?? '0'),
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching sign-in logs:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

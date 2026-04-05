import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, action, propertyId, details, latitude, longitude } = body;

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Get IP and user agent from headers
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
        details, 
        latitude, 
        longitude, 
        ip_address, 
        user_agent
      )
      VALUES (
        ${userId},
        ${propertyId || null},
        ${action},
        ${details ? JSON.stringify(details) : null},
        ${latitude || null},
        ${longitude || null},
        ${ip},
        ${userAgent}
      )
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("POST /api/audit/log error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

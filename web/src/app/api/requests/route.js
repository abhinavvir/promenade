import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    let query = `
      SELECT 
        tr.id, 
        tr.property_id, 
        tr.tenant_name, 
        tr.tenant_email,
        tr.request_type, 
        tr.priority, 
        tr.title, 
        tr.description, 
        tr.status,
        tr.created_at,
        tr.updated_at,
        p.name as property_name,
        p.address as property_address
      FROM tenant_requests tr
      JOIN properties p ON tr.property_id = p.id
      WHERE p.manager_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (propertyId) {
      query += ` AND tr.property_id = $${paramIndex}`;
      params.push(propertyId);
      paramIndex++;
    }

    if (status) {
      query += ` AND tr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE tr.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      tr.created_at DESC
    `;

    const requests = await sql(query, params);

    return Response.json({ requests });
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

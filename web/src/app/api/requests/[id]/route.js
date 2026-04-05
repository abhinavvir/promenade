import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const requestId = params.id;

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    const result = await sql`
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
      WHERE tr.id = ${requestId} AND p.manager_id = ${userId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    return Response.json({ request: result[0] });
  } catch (error) {
    console.error("GET /api/requests/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const requestId = params.id;
    const body = await request.json();
    const { status, userId } = body;

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Verify the request belongs to a property managed by this user
    const verification = await sql`
      SELECT tr.id 
      FROM tenant_requests tr
      JOIN properties p ON tr.property_id = p.id
      WHERE tr.id = ${requestId} AND p.manager_id = ${userId}
      LIMIT 1
    `;

    if (verification.length === 0) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      setClauses.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    if (setClauses.length === 1) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const updateQuery = `
      UPDATE tenant_requests 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, property_id, tenant_name, tenant_email, request_type, priority, title, description, status, created_at, updated_at
    `;
    values.push(requestId);

    const result = await sql(updateQuery, values);

    // Log the action
    await sql`
      INSERT INTO audit_logs (user_id, property_id, action, details)
      VALUES (
        ${userId},
        ${result[0].property_id},
        'update_request',
        ${JSON.stringify({ requestId, status })}
      )
    `;

    return Response.json({ request: result[0] });
  } catch (error) {
    console.error("PUT /api/requests/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

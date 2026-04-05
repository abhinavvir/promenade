import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const all = searchParams.get("all");

    // Return all properties (for admin dropdown)
    if (all === "true") {
      const properties = await sql`
        SELECT p.id, p.name, p.address, p.latitude, p.longitude, p.manager_id, p.created_at,
               u.name as manager_name
        FROM properties p
        LEFT JOIN auth_users u ON u.id = p.manager_id
        ORDER BY p.name ASC
      `;
      return Response.json({ properties });
    }

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Get properties assigned to this manager
    const properties = await sql`
      SELECT id, name, address, latitude, longitude, manager_id, created_at
      FROM properties
      WHERE manager_id = ${userId}
      ORDER BY name ASC
    `;

    return Response.json({ properties });
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, address, latitude, longitude, managerId } = body;

    if (!name || !address || !latitude || !longitude || !managerId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create the property
    const result = await sql`
      INSERT INTO properties (name, address, latitude, longitude, manager_id)
      VALUES (${name}, ${address}, ${latitude}, ${longitude}, ${managerId})
      RETURNING id, name, address, latitude, longitude, manager_id, created_at
    `;

    return Response.json({ property: result[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { propertyId, managerId } = body;

    if (!propertyId || !managerId) {
      return Response.json(
        { error: "Property ID and Manager ID are required" },
        { status: 400 },
      );
    }

    // Reassign property to a new manager
    const result = await sql`
      UPDATE properties
      SET manager_id = ${parseInt(managerId)}, updated_at = NOW()
      WHERE id = ${parseInt(propertyId)}
      RETURNING id, name, address, manager_id
    `;

    if (result.length === 0) {
      return Response.json({ error: "Property not found" }, { status: 404 });
    }

    return Response.json({ property: result[0] });
  } catch (error) {
    console.error("PATCH /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const unassignOnly = searchParams.get("unassign");

    if (!propertyId) {
      return Response.json({ error: "Property ID required" }, { status: 400 });
    }

    if (unassignOnly === "true") {
      // Just remove the manager assignment, don't delete the property
      await sql`
        UPDATE properties
        SET manager_id = NULL, updated_at = NOW()
        WHERE id = ${parseInt(propertyId)}
      `;
      return Response.json({
        success: true,
        message: "Manager unassigned from property",
      });
    }

    // Full delete
    await sql`DELETE FROM properties WHERE id = ${parseInt(propertyId)}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

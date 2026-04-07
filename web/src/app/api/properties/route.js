import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const all = searchParams.get("all");

    // Return all properties with their assigned managers (for admin)
    if (all === "true") {
      const properties = await sql`
        SELECT
          p.id, p.name, p.address, p.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', u.id, 'name', u.name, 'phone_number', u.phone_number)
              ORDER BY u.name
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'::json
          ) AS managers
        FROM properties p
        LEFT JOIN property_managers pm ON pm.property_id = p.id
        LEFT JOIN auth_users u ON u.id = pm.user_id
        GROUP BY p.id
        ORDER BY p.name ASC
      `;
      return Response.json({ properties });
    }

    if (!userId) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    // Get properties assigned to this manager via junction table
    const properties = await sql`
      SELECT p.id, p.name, p.address, p.latitude, p.longitude, p.created_at
      FROM properties p
      JOIN property_managers pm ON pm.property_id = p.id
      WHERE pm.user_id = ${userId}
      ORDER BY p.name ASC
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

    if (!name || !address || !latitude || !longitude) {
      return Response.json(
        { error: "Name, address, latitude, and longitude are required" },
        { status: 400 },
      );
    }

    // Create the property
    const result = await sql`
      INSERT INTO properties (name, address, latitude, longitude, manager_id)
      VALUES (${name}, ${address}, ${latitude}, ${longitude}, ${managerId || null})
      RETURNING id, name, address, latitude, longitude, manager_id, created_at
    `;

    const property = result[0];

    // If a manager was provided, also add to the junction table
    if (managerId) {
      await sql`
        INSERT INTO property_managers (property_id, user_id)
        VALUES (${property.id}, ${parseInt(managerId)})
        ON CONFLICT DO NOTHING
      `;
    }

    return Response.json({ property }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: add a manager to a property (many-to-many)
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

    // Insert into junction table (idempotent)
    await sql`
      INSERT INTO property_managers (property_id, user_id)
      VALUES (${parseInt(propertyId)}, ${parseInt(managerId)})
      ON CONFLICT DO NOTHING
    `;

    // Also keep manager_id on property for backwards compat
    await sql`
      UPDATE properties
      SET manager_id = ${parseInt(managerId)}, updated_at = NOW()
      WHERE id = ${parseInt(propertyId)}
    `;

    const property = await sql`
      SELECT id, name, address, manager_id FROM properties WHERE id = ${parseInt(propertyId)}
    `;

    if (property.length === 0) {
      return Response.json({ error: "Property not found" }, { status: 404 });
    }

    return Response.json({ property: property[0] });
  } catch (error) {
    console.error("PATCH /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const userId = searchParams.get("userId");     // remove specific manager
    const unassignOnly = searchParams.get("unassign"); // legacy: remove all

    if (!propertyId) {
      return Response.json({ error: "Property ID required" }, { status: 400 });
    }

    // Remove a specific manager from this property
    if (userId) {
      await sql`
        DELETE FROM property_managers
        WHERE property_id = ${parseInt(propertyId)} AND user_id = ${parseInt(userId)}
      `;
      // If this was the primary manager_id, clear it
      await sql`
        UPDATE properties
        SET manager_id = NULL, updated_at = NOW()
        WHERE id = ${parseInt(propertyId)} AND manager_id = ${parseInt(userId)}
      `;
      return Response.json({ success: true, message: "Manager removed from property" });
    }

    // Legacy: unassign all managers
    if (unassignOnly === "true") {
      await sql`DELETE FROM property_managers WHERE property_id = ${parseInt(propertyId)}`;
      await sql`
        UPDATE properties
        SET manager_id = NULL, updated_at = NOW()
        WHERE id = ${parseInt(propertyId)}
      `;
      return Response.json({ success: true, message: "All managers unassigned" });
    }

    // Full delete
    await sql`DELETE FROM properties WHERE id = ${parseInt(propertyId)}`;
    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/properties error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

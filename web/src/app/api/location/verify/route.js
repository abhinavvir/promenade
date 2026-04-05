import sql from "@/app/api/utils/sql";

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { latitude, longitude, userId } = body;

    if (!latitude || !longitude || !userId) {
      return Response.json(
        { error: "Location and user ID required" },
        { status: 400 },
      );
    }

    // Get all properties for this manager
    const properties = await sql`
      SELECT id, name, address, latitude, longitude
      FROM properties
      WHERE manager_id = ${userId}
    `;

    if (properties.length === 0) {
      return Response.json(
        {
          verified: false,
          message: "No properties assigned to this manager",
        },
        { status: 403 },
      );
    }

    // Check if user is within 200 meters of any property
    const MAX_DISTANCE = 200; // meters
    let nearestProperty = null;
    let minDistance = Infinity;

    for (const property of properties) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(property.latitude),
        parseFloat(property.longitude),
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestProperty = property;
      }
    }

    const verified = minDistance <= MAX_DISTANCE;

    // Log the verification attempt
    await sql`
      INSERT INTO audit_logs (
        user_id, 
        property_id, 
        action, 
        details, 
        latitude, 
        longitude
      )
      VALUES (
        ${userId},
        ${nearestProperty?.id || null},
        'location_verification',
        ${JSON.stringify({
          verified,
          distance: Math.round(minDistance),
          propertyId: nearestProperty?.id,
        })},
        ${latitude},
        ${longitude}
      )
    `;

    if (verified) {
      return Response.json({
        verified: true,
        property: nearestProperty,
        distance: Math.round(minDistance),
      });
    } else {
      return Response.json(
        {
          verified: false,
          message: `You must be within 200 meters of a property. Nearest property is ${Math.round(minDistance)} meters away.`,
          nearestProperty: nearestProperty?.name,
          distance: Math.round(minDistance),
        },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error("POST /api/location/verify error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

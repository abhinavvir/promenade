import sql from "@/app/api/utils/sql";

/**
 * GET /api/auth/phone-signin?phone=+1234567890
 * Looks up a user by phone number and returns their stored login email.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return Response.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    // Try exact match first
    let users = await sql`
      SELECT id, email, phone_number FROM auth_users
      WHERE phone_number = ${phone.trim()}
      LIMIT 1
    `;

    // If no exact match, try stripping non-numeric characters from both sides
    if (users.length === 0) {
      const cleanPhone = phone.trim().replace(/[^0-9]/g, "");
      users = await sql`
        SELECT id, email, phone_number FROM auth_users
        WHERE REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = ${cleanPhone}
        LIMIT 1
      `;
    }

    if (users.length === 0) {
      return Response.json({ error: "No account found" }, { status: 404 });
    }

    const user = users[0];
    return Response.json({ loginEmail: user.email });
  } catch (error) {
    console.error("Error looking up phone:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Calculate distance between two coordinates using Haversine formula
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
    const { phoneNumber, latitude, longitude, deviceInfo } = body;

    if (!phoneNumber || !latitude || !longitude) {
      return Response.json(
        { error: "Phone number and location are required" },
        { status: 400 },
      );
    }

    // Find user by phone number
    const users = await sql`
      SELECT u.id, u.phone_number, u.name, u.role, p.id as property_id, 
             p.name as property_name, p.latitude as property_lat, 
             p.longitude as property_lon
      FROM auth_users u
      LEFT JOIN properties p ON p.manager_id = u.id
      WHERE u.phone_number = ${phoneNumber}
      LIMIT 1
    `;

    if (users.length === 0) {
      // Log failed sign-in attempt
      await sql`
        INSERT INTO audit_logs (action, sign_in_status, latitude, longitude, 
                                ip_address, device_info, created_at)
        VALUES ('sign_in_attempt', 'failed_user_not_found', ${latitude}, ${longitude},
                ${request.headers.get("x-forwarded-for") || "unknown"}, 
                ${JSON.stringify(deviceInfo || {})}, NOW())
      `;

      return Response.json(
        { error: "Phone number not registered" },
        { status: 404 },
      );
    }

    const user = users[0];

    // Check if user has an assigned property
    if (!user.property_id) {
      await sql`
        INSERT INTO audit_logs (user_id, action, sign_in_status, latitude, longitude,
                                ip_address, device_info, created_at)
        VALUES (${user.id}, 'sign_in_attempt', 'failed_no_property', ${latitude}, ${longitude},
                ${request.headers.get("x-forwarded-for") || "unknown"},
                ${JSON.stringify(deviceInfo || {})}, NOW())
      `;

      return Response.json(
        { error: "No property assigned to this account. Contact admin." },
        { status: 403 },
      );
    }

    // Calculate distance from assigned property
    const distance = calculateDistance(
      latitude,
      longitude,
      parseFloat(user.property_lat),
      parseFloat(user.property_lon),
    );

    const ALLOWED_RADIUS = 100; // 100 meters

    if (distance > ALLOWED_RADIUS) {
      // Log failed sign-in attempt due to location
      await sql`
        INSERT INTO audit_logs (user_id, property_id, action, sign_in_status, 
                                latitude, longitude, distance_from_property,
                                ip_address, device_info, created_at)
        VALUES (${user.id}, ${user.property_id}, 'sign_in_attempt', 'failed_location_verification',
                ${latitude}, ${longitude}, ${distance.toFixed(2)},
                ${request.headers.get("x-forwarded-for") || "unknown"},
                ${JSON.stringify(deviceInfo || {})}, NOW())
      `;

      return Response.json(
        {
          error: "You must be at your assigned property to sign in",
          distance: Math.round(distance),
          allowedRadius: ALLOWED_RADIUS,
          propertyName: user.property_name,
        },
        { status: 403 },
      );
    }

    // Location verified - log successful sign-in
    await sql`
      INSERT INTO audit_logs (user_id, property_id, action, sign_in_status,
                              latitude, longitude, distance_from_property,
                              ip_address, device_info, created_at)
      VALUES (${user.id}, ${user.property_id}, 'sign_in_attempt', 'success',
              ${latitude}, ${longitude}, ${distance.toFixed(2)},
              ${request.headers.get("x-forwarded-for") || "unknown"},
              ${JSON.stringify(deviceInfo || {})}, NOW())
    `;

    return Response.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
        name: user.name,
        role: user.role,
        propertyId: user.property_id,
        propertyName: user.property_name,
      },
      distance: Math.round(distance),
    });
  } catch (error) {
    console.error("Error in phone sign-in:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

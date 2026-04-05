import sql from "@/app/api/utils/sql";

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
    const { phoneNumber, latitude, longitude } = body;

    if (!phoneNumber || !latitude || !longitude) {
      return Response.json(
        { error: "Phone number and location are required" },
        { status: 400 },
      );
    }

    // Find user by phone number
    const users = await sql`
      SELECT u.id, u.phone_number, u.name, p.id as property_id, 
             p.name as property_name, p.address, p.latitude as property_lat, 
             p.longitude as property_lon
      FROM auth_users u
      LEFT JOIN properties p ON p.manager_id = u.id
      WHERE u.phone_number = ${phoneNumber}
      LIMIT 1
    `;

    if (users.length === 0) {
      return Response.json(
        {
          canSignIn: false,
          reason: "Phone number not registered",
          showSignIn: false,
        },
        { status: 200 },
      );
    }

    const user = users[0];

    if (!user.property_id) {
      return Response.json(
        {
          canSignIn: false,
          reason: "No property assigned. Contact admin.",
          showSignIn: false,
          user: {
            name: user.name,
            phoneNumber: user.phone_number,
          },
        },
        { status: 200 },
      );
    }

    // Calculate distance from assigned property
    const distance = calculateDistance(
      latitude,
      longitude,
      parseFloat(user.property_lat),
      parseFloat(user.property_lon),
    );

    const ALLOWED_RADIUS = 200; // 200 meters
    const canSignIn = distance <= ALLOWED_RADIUS;

    return Response.json({
      canSignIn,
      showSignIn: canSignIn,
      distance: Math.round(distance),
      allowedRadius: ALLOWED_RADIUS,
      user: {
        name: user.name,
        phoneNumber: user.phone_number,
      },
      property: {
        id: user.property_id,
        name: user.property_name,
        address: user.address,
      },
      reason: canSignIn
        ? "Location verified"
        : `You must be within ${ALLOWED_RADIUS}m of ${user.property_name} to sign in`,
    });
  } catch (error) {
    console.error("Error checking location:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

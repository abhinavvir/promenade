import sql from "@/app/api/utils/sql";

// This is a temporary endpoint to assign properties to managers for testing
// In production, this would be done through an admin interface
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, phoneNumber, propertyId } = body;

    if ((!email && !phoneNumber) || !propertyId) {
      return Response.json(
        { error: "Email or phone number and property ID are required" },
        { status: 400 },
      );
    }

    // Find user by email or phone number
    let users;
    if (phoneNumber) {
      users = await sql`
        SELECT id FROM auth_users WHERE phone_number = ${phoneNumber} LIMIT 1
      `;
    } else {
      users = await sql`
        SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
      `;
    }

    if (users.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const userId = users[0].id;

    // Assign property to manager
    await sql`
      UPDATE properties 
      SET manager_id = ${userId}
      WHERE id = ${propertyId}
    `;

    return Response.json({
      success: true,
      message: "Property assigned successfully",
    });
  } catch (error) {
    console.error("POST /api/assign-property error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

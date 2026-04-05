import sql from "@/app/api/utils/sql";
import bcrypt from "bcryptjs";

// Generate a random temporary password
function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure at least one uppercase, one lowercase, one digit
  password += "A1a";
  // Shuffle
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
  return password;
}

export async function GET(request) {
  try {
    const users = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.role,
        u.created_via,
        u.created_at,
        p.id as property_id,
        p.name as property_name,
        p.address as property_address,
        p.latitude,
        p.longitude,
        a.is_temporary_password
      FROM auth_users u
      LEFT JOIN properties p ON p.manager_id = u.id
      LEFT JOIN auth_accounts a ON a."userId" = u.id AND a.provider = 'credentials'
      WHERE u.role = 'manager'
      ORDER BY u.name ASC
    `;

    return Response.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phoneNumber, email } = body;

    if (!phoneNumber) {
      return Response.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    if (!name || name.trim().length === 0) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if phone number already exists
    const existingPhone = await sql`
      SELECT id FROM auth_users WHERE phone_number = ${phoneNumber}
    `;

    if (existingPhone.length > 0) {
      return Response.json(
        { error: "Phone number already registered" },
        { status: 400 },
      );
    }

    // If email provided, check if it already exists
    const userEmail = email && email.trim().length > 0 ? email.trim() : null;
    if (userEmail) {
      const existingEmail = await sql`
        SELECT id FROM auth_users WHERE email = ${userEmail}
      `;
      if (existingEmail.length > 0) {
        return Response.json(
          { error: "Email already registered" },
          { status: 400 },
        );
      }
    }

    // Generate a unique email for auth if none provided
    // The auth system requires email for sign-in
    const authEmail =
      userEmail ||
      `manager_${phoneNumber.replace(/[^0-9]/g, "")}@property.local`;

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user
    const newUser = await sql`
      INSERT INTO auth_users (name, email, phone_number, role, created_via)
      VALUES (${name.trim()}, ${authEmail}, ${phoneNumber}, 'manager', 'admin')
      RETURNING id, name, email, phone_number, role
    `;

    const userId = newUser[0].id;

    // Create credentials account with temporary password
    await sql`
      INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password, is_temporary_password)
      VALUES (${userId}, 'credentials', 'credentials', ${userId.toString()}, ${hashedPassword}, true)
    `;

    return Response.json({
      user: newUser[0],
      tempPassword: tempPassword,
      loginEmail: authEmail,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Delete in correct order to respect foreign keys
    await sql`DELETE FROM audit_logs WHERE user_id = ${parseInt(userId)}`;
    await sql`UPDATE properties SET manager_id = NULL WHERE manager_id = ${parseInt(userId)}`;
    await sql`DELETE FROM auth_sessions WHERE "userId" = ${parseInt(userId)}`;
    await sql`DELETE FROM auth_accounts WHERE "userId" = ${parseInt(userId)}`;
    await sql`DELETE FROM auth_users WHERE id = ${parseInt(userId)}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Generate a new temporary password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Check if an auth_accounts record exists for this user
    const existing = await sql`
      SELECT id FROM auth_accounts WHERE "userId" = ${parseInt(userId)} AND provider = 'credentials'
    `;

    if (existing.length > 0) {
      // Update existing credentials
      await sql`
        UPDATE auth_accounts
        SET password = ${hashedPassword}, is_temporary_password = true
        WHERE "userId" = ${parseInt(userId)} AND provider = 'credentials'
      `;
    } else {
      // Create new credentials account (e.g. for users created before this system)
      await sql`
        INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password, is_temporary_password)
        VALUES (${parseInt(userId)}, 'credentials', 'credentials', ${userId.toString()}, ${hashedPassword}, true)
      `;
    }

    // Fetch the user's login email so we can show it in the modal
    const userRows = await sql`
      SELECT email, phone_number FROM auth_users WHERE id = ${parseInt(userId)}
    `;

    const user = userRows[0];
    const loginEmail =
      user?.email ||
      `manager_${(user?.phone_number || "").replace(/[^0-9]/g, "")}@property.local`;

    return Response.json({ tempPassword, loginEmail });
  } catch (error) {
    console.error("Error resetting password:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

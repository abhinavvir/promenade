import sql from "@/app/api/utils/sql";

/**
 * GET /api/admin/reports
 *
 * Query params:
 *   startDate  – ISO date string (inclusive), e.g. "2026-04-01"
 *   endDate    – ISO date string (inclusive), e.g. "2026-04-06"
 *   userId     – optional: filter to a single manager
 *   propertyId – optional: filter to a single property
 *   format     – "json" (default) | "csv"
 *
 * Returns per-session records + per-manager aggregate summary.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const propertyId = searchParams.get("propertyId");
    const format = searchParams.get("format") || "json";

    if (!startDate || !endDate) {
      return Response.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    // Fetch all check-in sessions in the date range
    const sessions = await sql`
      SELECT
        ci.id,
        ci.user_id,
        ci.property_id,
        ci.check_in_time,
        ci.check_out_time,
        ci.check_in_status,
        ci.check_in_latitude,
        ci.check_in_longitude,
        u.name    AS manager_name,
        u.phone_number,
        p.name    AS property_name,
        p.address AS property_address
      FROM check_ins ci
      JOIN auth_users u ON ci.user_id = u.id
      LEFT JOIN properties p ON ci.property_id = p.id
      WHERE
        ci.check_in_time >= ${startDate}::date
        AND ci.check_in_time < (${endDate}::date + INTERVAL '1 day')
        ${userId ? sql`AND ci.user_id = ${parseInt(userId)}` : sql``}
        ${propertyId ? sql`AND ci.property_id = ${parseInt(propertyId)}` : sql``}
      ORDER BY ci.check_in_time DESC
    `;

    // Build per-manager summary
    const managerMap = {};
    for (const s of sessions) {
      const key = s.user_id;
      if (!managerMap[key]) {
        managerMap[key] = {
          userId: s.user_id,
          managerName: s.manager_name,
          phoneNumber: s.phone_number,
          propertyName: s.property_name,
          totalSessions: 0,
          completedSessions: 0,
          incompleteSessions: 0,
          totalMinutes: 0,
        };
      }
      const m = managerMap[key];
      m.totalSessions++;
      if (s.check_in_status === "checked_out" && s.check_out_time) {
        m.completedSessions++;
        const diffMs =
          new Date(s.check_out_time) - new Date(s.check_in_time);
        m.totalMinutes += Math.round(diffMs / 60000);
      } else {
        m.incompleteSessions++;
      }
    }

    const summary = Object.values(managerMap).map((m) => ({
      ...m,
      totalHours: +(m.totalMinutes / 60).toFixed(2),
      avgHoursPerSession:
        m.completedSessions > 0
          ? +((m.totalMinutes / 60) / m.completedSessions).toFixed(2)
          : 0,
    }));

    // Enrich sessions with computed duration
    const enrichedSessions = sessions.map((s) => {
      let durationMinutes = null;
      if (s.check_out_time && s.check_in_time) {
        durationMinutes = Math.round(
          (new Date(s.check_out_time) - new Date(s.check_in_time)) / 60000,
        );
      }
      return { ...s, durationMinutes };
    });

    if (format === "csv") {
      const rows = [
        [
          "Session ID",
          "Manager",
          "Phone",
          "Property",
          "Check-In Time",
          "Check-Out Time",
          "Duration (mins)",
          "Status",
        ].join(","),
        ...enrichedSessions.map((s) =>
          [
            s.id,
            `"${s.manager_name ?? ""}"`,
            s.phone_number ?? "",
            `"${s.property_name ?? ""}"`,
            s.check_in_time
              ? new Date(s.check_in_time).toISOString()
              : "",
            s.check_out_time
              ? new Date(s.check_out_time).toISOString()
              : "",
            s.durationMinutes ?? "",
            s.check_in_status ?? "",
          ].join(","),
        ),
      ].join("\n");

      return new Response(rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="promenade-report-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    return Response.json({ sessions: enrichedSessions, summary });
  } catch (error) {
    console.error("GET /api/admin/reports error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

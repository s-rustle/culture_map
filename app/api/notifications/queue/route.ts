/**
 * Global Pulse — Notifications queue (Task 5.5)
 * GET /api/notifications/queue?tab=pending|sent|dismissed
 * Returns notifications filtered by tab. Admin sees all, coaches see only their own.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") ?? "pending";

    const status =
      tab === "sent"
        ? "sent"
        : tab === "dismissed"
          ? "dismissed"
          : "draft";

    if (!isDatabaseConfigured() || !sql) {
      return NextResponse.json({ notifications: [] });
    }

    let coachIdDb: number | null = null;
    if (!user.is_admin) {
      const { rows } = await sql`
        SELECT id FROM coaches WHERE email = ${user.email} LIMIT 1
      `;
      coachIdDb = (rows[0] as { id: number } | undefined)?.id ?? null;
      if (!coachIdDb) {
        return NextResponse.json({ notifications: [] });
      }
    }

    let query;
    if (user.is_admin) {
      query = sql`
        SELECT n.id, n.situation_id, n.coach_id, n.email_type, n.subject, n.body_html,
               n.screenshot_url, n.status, n.approved_by, n.approved_at, n.sent_at, n.created_at,
               c.name AS coach_name, c.email AS coach_email
        FROM notifications n
        JOIN coaches c ON c.id = n.coach_id
        WHERE n.status = ${status}
        ORDER BY n.created_at DESC
      `;
    } else {
      query = sql`
        SELECT n.id, n.situation_id, n.coach_id, n.email_type, n.subject, n.body_html,
               n.screenshot_url, n.status, n.approved_by, n.approved_at, n.sent_at, n.created_at,
               c.name AS coach_name, c.email AS coach_email
        FROM notifications n
        JOIN coaches c ON c.id = n.coach_id
        WHERE n.coach_id = ${coachIdDb}
          AND n.status = ${status}
        ORDER BY n.created_at DESC
      `;
    }

    const { rows } = await query;

    const notifications = rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as number,
        situation_id: row.situation_id as number | null,
        coach_id: row.coach_id as number,
        coach_name: row.coach_name as string,
        coach_email: row.coach_email as string,
        email_type: row.email_type as string,
        subject: row.subject as string,
        body_html: row.body_html as string,
        screenshot_url: row.screenshot_url as string | null,
        status: row.status as string,
        approved_at: row.approved_at as string | null,
        sent_at: row.sent_at as string | null,
        created_at: row.created_at as string,
      };
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("Notifications queue error:", err);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

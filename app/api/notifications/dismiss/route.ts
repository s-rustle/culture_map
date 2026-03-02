/**
 * Global Pulse — Dismiss notification (Task 5.5)
 * POST /api/notifications/dismiss — Body: { notification_id: number }
 * Updates status to 'dismissed'. Admin only (or coach can dismiss their own? Task says dismiss - I'll allow admin and the recipient coach).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = body.notification_id;

    if (!notificationId || typeof notificationId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid notification_id" },
        { status: 400 }
      );
    }

    if (!isDatabaseConfigured() || !sql) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const { rows: coachRows } = await sql`
      SELECT id FROM coaches WHERE email = ${user.email} LIMIT 1
    `;
    const coachId = (coachRows[0] as { id: number } | undefined)?.id;
    if (!coachId) {
      return NextResponse.json(
        { error: "Coach not found" },
        { status: 500 }
      );
    }

    const { rows: notifRows } = await sql`
      SELECT id, status, coach_id FROM notifications WHERE id = ${notificationId} LIMIT 1
    `;
    const notification = notifRows[0] as { id: number; status: string; coach_id: number } | undefined;

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (!user.is_admin && notification.coach_id !== coachId) {
      return NextResponse.json(
        { error: "You can only dismiss notifications addressed to you" },
        { status: 403 }
      );
    }

    if (notification.status !== "draft" && notification.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot dismiss notification with status '${notification.status}'` },
        { status: 400 }
      );
    }

    await sql`
      UPDATE notifications
      SET status = 'dismissed', updated_at = NOW()
      WHERE id = ${notificationId}
    `;

    return NextResponse.json({ ok: true, message: "Notification dismissed" });
  } catch (err) {
    console.error("Dismiss notification error:", err);
    return NextResponse.json(
      { error: "Failed to dismiss notification" },
      { status: 500 }
    );
  }
}

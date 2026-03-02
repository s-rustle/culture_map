/**
 * Global Pulse — Approve notification (Task 5.5 + 5.7)
 * POST /api/notifications/approve — Body: { notification_id: number }
 * Updates status to 'approved'. Critical: send immediately.
 * Non-critical: if coach outside 9am–6pm local, queue for 9am their time.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql, isDatabaseConfigured } from "@/lib/db";
import { isWithinBusinessHours, getNext9amLocal } from "@/lib/timezone-queue";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.is_admin) {
      return NextResponse.json(
        { error: "Only admins can approve notifications" },
        { status: 403 }
      );
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
    const adminCoachId = (coachRows[0] as { id: number } | undefined)?.id;
    if (!adminCoachId) {
      return NextResponse.json(
        { error: "Admin coach not found" },
        { status: 500 }
      );
    }

    const { rows: notifRows } = await sql`
      SELECT n.id, n.status, n.coach_id, n.situation_id, s.severity
      FROM notifications n
      LEFT JOIN situations s ON s.id = n.situation_id
      WHERE n.id = ${notificationId} LIMIT 1
    `;
    const row = notifRows[0] as {
      id: number;
      status: string;
      coach_id: number;
      situation_id: number | null;
      severity: string | null;
    } | undefined;

    if (!row) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (row.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot approve notification with status '${row.status}'` },
        { status: 400 }
      );
    }

    const isCritical =
      (row.severity ?? "").toLowerCase() === "critical";

    const { rows: coachTzRows } = await sql`
      SELECT timezone FROM coaches WHERE id = ${row.coach_id} LIMIT 1
    `;
    const coachTimezone =
      (coachTzRows[0] as { timezone: string } | undefined)?.timezone ?? "America/Chicago";

    const shouldSendNow =
      isCritical || isWithinBusinessHours(coachTimezone);

    if (shouldSendNow) {
      await sql`
        UPDATE notifications
        SET status = 'approved', approved_by = ${adminCoachId}, approved_at = NOW(), updated_at = NOW()
        WHERE id = ${notificationId}
      `;

      const baseUrl =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXTAUTH_URL ?? "http://localhost:3000";

      const sendRes = await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId, sent_reason: "manual_approval" }),
      });
      const sendData = await sendRes.json().catch(() => ({}));

      if (!sendRes.ok) {
        await sql`
          UPDATE notifications SET status = 'failed', updated_at = NOW() WHERE id = ${notificationId}
        `;
        return NextResponse.json(
          { error: sendData.error ?? "Failed to send email" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Notification approved and email sent",
        sentTo: sendData.sentTo,
      });
    }

    const scheduledFor = getNext9amLocal(coachTimezone);
    await sql`
      UPDATE notifications
      SET status = 'scheduled', approved_by = ${adminCoachId}, approved_at = NOW(),
          scheduled_for = ${scheduledFor}, updated_at = NOW()
      WHERE id = ${notificationId}
    `;

    return NextResponse.json({
      ok: true,
      message: "Notification approved and queued for 9am coach local time",
      scheduledFor,
    });
  } catch (err) {
    console.error("Approve notification error:", err);
    return NextResponse.json(
      { error: "Failed to approve notification" },
      { status: 500 }
    );
  }
}

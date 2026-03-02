/**
 * Global Pulse — Email send (Task 5.6)
 * Sends a notification email via Resend. Called by approval flow.
 * POST /api/email/send — Body: { notification_id: number }
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sql, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const notificationId = body.notification_id;
    const sentReason = body.sent_reason ?? null;

    if (!notificationId || typeof notificationId !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid notification_id" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 503 }
      );
    }

    if (!isDatabaseConfigured() || !sql) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const { rows: notifRows } = await sql`
      SELECT n.id, n.situation_id, n.coach_id, n.email_type, n.subject, n.body_html, n.status
      FROM notifications n
      WHERE n.id = ${notificationId}
      LIMIT 1
    `;
    const notification = notifRows[0] as
      | {
          id: number;
          situation_id: number | null;
          coach_id: number;
          email_type: string;
          subject: string;
          body_html: string;
          status: string;
        }
      | undefined;

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (
      notification.status !== "draft" &&
      notification.status !== "approved" &&
      notification.status !== "scheduled"
    ) {
      return NextResponse.json(
        { error: `Notification status is '${notification.status}', cannot send` },
        { status: 400 }
      );
    }

    const { rows: coachRows } = await sql`
      SELECT id, name, email FROM coaches WHERE id = ${notification.coach_id} LIMIT 1
    `;
    const coach = coachRows[0] as { id: number; name: string; email: string } | undefined;

    if (!coach) {
      return NextResponse.json(
        { error: "Coach not found" },
        { status: 404 }
      );
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "Global Pulse <onboarding@resend.dev>";
    const resend = new Resend(apiKey);

    const attachments: { content: Buffer; filename: string; content_id: string }[] = [];
    if (notification.situation_id) {
      const baseUrl =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      try {
        const screenshotRes = await fetch(
          `${baseUrl}/api/screenshot/render?situation_id=${notification.situation_id}`,
          { headers: { Accept: "image/png" } }
        );
        if (screenshotRes.ok) {
          const buffer = Buffer.from(await screenshotRes.arrayBuffer());
          attachments.push({
            content: buffer,
            filename: "situation-screenshot.png",
            content_id: "screenshot",
          });
        }
      } catch (err) {
        console.warn("Could not fetch screenshot for email:", err);
      }
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: coach.email,
      subject: notification.subject,
      html: notification.body_html,
      attachments:
        attachments.length > 0
          ? attachments.map((a) => ({
              content: a.content,
              filename: a.filename,
              content_id: a.content_id,
              content_type: "image/png",
            }))
          : undefined,
    });

    if (error) {
      await sql`
        UPDATE notifications
        SET status = 'failed', updated_at = NOW()
        WHERE id = ${notificationId}
      `;
      return NextResponse.json(
        { error: "Failed to send email", details: error.message },
        { status: 500 }
      );
    }

    await sql`
      UPDATE notifications
      SET status = 'sent', sent_at = NOW(), sent_reason = ${sentReason}, updated_at = NOW()
      WHERE id = ${notificationId}
    `;

    return NextResponse.json({
      ok: true,
      messageId: data?.id,
      sentTo: coach.email,
    });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}

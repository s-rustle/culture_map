"use client";

/**
 * Global Pulse — Notifications page (Task 5.5)
 * Pending / Sent / Dismissed tabs. EmailPreview + ApprovalActions per draft.
 * Admin sees all; coaches see only their own.
 */

import { useCallback, useEffect, useState } from "react";
import { EmailPreview } from "./components/EmailPreview";
import { ApprovalActions } from "./components/ApprovalActions";

type Tab = "pending" | "sent" | "dismissed";

interface NotificationItem {
  id: number;
  situation_id: number | null;
  coach_id: number;
  coach_name: string;
  coach_email: string;
  email_type: string;
  subject: string;
  body_html: string;
  screenshot_url: string | null;
  status: string;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
}

function getScreenshotUrl(item: NotificationItem): string | undefined {
  if (item.screenshot_url) return item.screenshot_url;
  if (item.situation_id && typeof window !== "undefined") {
    return `${window.location.origin}/api/screenshot/render?situation_id=${item.situation_id}`;
  }
  return undefined;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/queue?tab=${tab}`);
      const data = await res.json().catch(() => ({}));
      setNotifications(data.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleApproved = () => fetchNotifications();
  const handleDismissed = () => fetchNotifications();
  const handleEditSave = (id: number, subject: string, bodyHtml: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, subject, body_html: bodyHtml } : n
      )
    );
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: "#F7F6FE" }}
    >
      <h2 className="text-xl font-semibold text-brand-dark-bg mb-4">
        Notifications
      </h2>

      <div className="flex gap-2 mb-6 border-b border-brand-light-gray-violet">
        {(["pending", "sent", "dismissed"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              tab === t
                ? "text-brand-accent border-b-2 border-brand-accent bg-white -mb-px"
                : "text-brand-charcoal-violet hover:text-brand-dark-bg"
            }`}
            style={
              tab === t
                ? { color: "#7357FF", borderBottomColor: "#7357FF" }
                : undefined
            }
          >
            {t === "pending" ? "Pending" : t === "sent" ? "Sent" : "Dismissed"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-brand-charcoal-violet">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-brand-charcoal-violet">
          {tab === "pending" && "No pending notifications."}
          {tab === "sent" && "No sent notifications yet."}
          {tab === "dismissed" && "No dismissed notifications."}
        </p>
      ) : tab === "pending" ? (
        <div className="space-y-6">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-brand-light-gray-violet p-4 bg-white"
            >
              <EmailPreview
                recipientName={n.coach_name}
                recipientEmail={n.coach_email}
                subject={n.subject}
                bodyHtml={n.body_html}
                screenshotUrl={getScreenshotUrl(n)}
              />
              <div className="mt-4 pt-4 border-t border-brand-light-gray-violet">
                <ApprovalActions
                  notificationId={n.id}
                  subject={n.subject}
                  bodyHtml={n.body_html}
                  onApproved={handleApproved}
                  onDismissed={handleDismissed}
                  onSubjectBodyChange={(subj, body) =>
                    handleEditSave(n.id, subj, body)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-brand-light-gray-violet p-4 bg-white flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <div className="text-sm font-medium text-brand-dark-bg">
                  {n.subject}
                </div>
                <div className="text-sm text-brand-charcoal-violet">
                  To: {n.coach_name} &lt;{n.coach_email}&gt;
                </div>
              </div>
              <div className="text-xs text-brand-medium-gray-violet">
                {n.sent_at
                  ? `Sent ${new Date(n.sent_at).toLocaleString()}`
                  : n.status === "dismissed"
                    ? `Dismissed ${new Date(n.created_at).toLocaleString()}`
                    : new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

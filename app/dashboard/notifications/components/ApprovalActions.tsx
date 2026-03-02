/**
 * Global Pulse — ApprovalActions (Task 5.4)
 * Three buttons per draft notification: Approve, Edit, Dismiss
 */

"use client";

import { useState } from "react";

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

interface ApprovalActionsProps {
  notificationId: number;
  onApproved?: () => void;
  onDismissed?: () => void;
  onEdit?: (subject: string, bodyHtml: string) => void;
  subject: string;
  bodyHtml: string;
  onSubjectBodyChange?: (subject: string, bodyHtml: string) => void;
}

export function ApprovalActions({
  notificationId,
  onApproved,
  onDismissed,
  subject,
  bodyHtml,
  onSubjectBodyChange,
}: ApprovalActionsProps) {
  const [loading, setLoading] = useState<"approve" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(subject);
  const [editBody, setEditBody] = useState(bodyHtml);

  async function handleApprove() {
    setError(null);
    setLoading("approve");
    try {
      const res = await fetch("/api/notifications/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to approve");
        return;
      }
      onApproved?.();
    } catch {
      setError("Failed to approve");
    } finally {
      setLoading(null);
    }
  }

  async function handleDismiss() {
    setError(null);
    setLoading("dismiss");
    try {
      const res = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_id: notificationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to dismiss");
        return;
      }
      onDismissed?.();
    } catch {
      setError("Failed to dismiss");
    } finally {
      setLoading(null);
    }
  }

  async function handleEditSave() {
    setError(null);
    try {
      const res = await fetch("/api/notifications/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: notificationId,
          subject: editSubject,
          body_html: editBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSubjectBodyChange?.(editSubject, editBody);
      setEditing(false);
    } catch {
      setError("Failed to save");
    }
  }

  function handleEditCancel() {
    setEditSubject(subject);
    setEditBody(bodyHtml);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-brand-charcoal-violet mb-1">
            Subject
          </label>
          <input
            type="text"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            className="w-full px-3 py-2 rounded border border-brand-light-gray-violet text-sm text-brand-dark-bg"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-charcoal-violet mb-1">
            Body (HTML)
          </label>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 rounded border border-brand-light-gray-violet text-sm text-brand-dark-bg font-mono"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEditSave}
            className="px-4 py-2 rounded text-sm font-medium text-brand-text-on-accent bg-brand-accent hover:bg-brand-accent-hover"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleEditCancel}
            className="px-4 py-2 rounded text-sm font-medium text-brand-charcoal-violet border border-brand-light-gray-violet hover:bg-brand-pale-lavender"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={!!loading}
            className="px-4 py-2 rounded text-sm font-medium text-brand-text-on-accent bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
          {loading === "approve" ? <Spinner /> : null}
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={!!loading}
          className="px-4 py-2 rounded text-sm font-medium text-brand-dark-bg border border-brand-light-gray-violet hover:bg-brand-pale-lavender disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={!!loading}
          className="px-4 py-2 rounded text-sm font-medium text-brand-charcoal-violet border border-brand-light-gray-violet hover:bg-brand-pale-lavender disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading === "dismiss" ? <Spinner /> : null}
          {loading === "dismiss" ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-brand-violet font-medium">{error}</p>
      )}
    </div>
  );
}

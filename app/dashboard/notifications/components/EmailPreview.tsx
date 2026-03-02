/**
 * Global Pulse — EmailPreview (Task 5.3)
 * Renders a preview of a draft notification as it will appear in the recipient's inbox.
 * Shows: recipient coach name/email, subject line, body HTML rendered, embedded screenshot preview.
 */

"use client";

interface EmailPreviewProps {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  screenshotUrl?: string | null;
}

export function EmailPreview({
  recipientName,
  recipientEmail,
  subject,
  bodyHtml,
  screenshotUrl,
}: EmailPreviewProps) {
  return (
    <div
      className="rounded-lg border border-brand-light-gray-violet bg-white p-4 shadow-sm"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="mb-4 border-b border-brand-light-gray-violet pb-3">
        <div className="text-xs font-medium text-brand-medium-gray-violet mb-1">
          To
        </div>
        <div className="text-sm font-medium text-brand-dark-bg">
          {recipientName}
        </div>
        <div className="text-sm text-brand-charcoal-violet">{recipientEmail}</div>
      </div>

      <div className="mb-4 border-b border-brand-light-gray-violet pb-3">
        <div className="text-xs font-medium text-brand-medium-gray-violet mb-1">
          Subject
        </div>
        <div className="text-sm font-medium text-brand-dark-bg">{subject}</div>
      </div>

      <div className="mb-4">
        <div className="text-xs font-medium text-brand-medium-gray-violet mb-2">
          Message
        </div>
        <div
          className="prose prose-sm max-w-none text-brand-charcoal-violet rounded border border-brand-light-gray-violet bg-white p-4"
          style={{
            maxHeight: "320px",
            overflowY: "auto",
            backgroundColor: "#F7F6FE",
          }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>

      {screenshotUrl && (
        <div className="mt-4">
          <div className="text-xs font-medium text-brand-medium-gray-violet mb-2">
            Dashboard snapshot
          </div>
          <div className="rounded border border-brand-light-gray-violet overflow-hidden bg-brand-pale-lavender">
            <img
              src={screenshotUrl}
              alt="Situation dashboard snapshot"
              className="max-w-full h-auto"
              style={{ maxHeight: "240px", objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { useReporting } from "../hooks/useReporting";
import { useAuth } from "../hooks/useAuth";

/**
 * Reusable Report Modal for reporting dog profiles, chat messages, forum threads, and forum comments
 */
export default function ReportModal({ isOpen, reportType, targetData, onClose, onReportSuccess }) {
  const { user } = useAuth();
  const { submitReport, loading } = useReporting();

  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Determine category options based on report type
  const getCategoryOptions = () => {
    if (reportType === "dog_profile") {
      return [
        { value: "fake_profile", label: "Fake Profile" },
        { value: "inappropriate_content", label: "Inappropriate Content" },
        { value: "offensive_language", label: "Offensive Language" },
        { value: "scam_fraud", label: "Scam/Fraud" },
        { value: "copyright_infringement", label: "Copyright Infringement" },
        { value: "privacy_violation", label: "Privacy Violation" },
        { value: "animal_abuse", label: "Animal Abuse" },
        { value: "inappropriate_images", label: "Inappropriate Images" },
        { value: "other", label: "Other" },
      ];
    } else if (
      reportType === "chat_message" ||
      reportType === "forum_thread" ||
      reportType === "forum_comment"
    ) {
      return [
        { value: "harassment", label: "Harassment" },
        { value: "spam", label: "Spam" },
        { value: "explicit_content", label: "Explicit Content" },
        { value: "hate_speech", label: "Hate Speech" },
        { value: "misinformation", label: "Misinformation" },
        { value: "offensive_language", label: "Offensive Language" },
        { value: "other", label: "Other" },
      ];
    }
    return [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!category) {
      setError("Please select a category");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    try {
      const reportData = {
        report_type: reportType,
        target_id: targetData.id,
        category,
        reason: reason || category,
        description,
        reporter_id: user.id,
        evidence_urls: [], // Can be enhanced to support file uploads
      };

      // Add type-specific data
      if (reportType === "dog_profile") {
        reportData.dog_owner_id = targetData.ownerId;
        reportData.dog_name = targetData.name;
        reportData.dog_breed = targetData.breed;
      } else if (reportType === "chat_message") {
        reportData.sender_id = targetData.senderId;
        reportData.receiver_id = targetData.receiverId;
        reportData.message_content = targetData.content;
      } else if (reportType === "forum_thread") {
        reportData.thread_author_id = targetData.authorId;
        reportData.thread_title = targetData.title;
        reportData.thread_content = targetData.content;
      } else if (reportType === "forum_comment") {
        reportData.comment_author_id = targetData.authorId;
        reportData.comment_content = targetData.content;
      }

      const result = await submitReport(reportData);

      if (result.success) {
        setSuccess(true);
        // Reset form
        setReason("");
        setCategory("");
        setDescription("");

        // Call success callback
        if (onReportSuccess) {
          onReportSuccess(result.report_id);
        }

        // Close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || "Failed to submit report");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };

  if (!isOpen) return null;

  const categoryOptions = getCategoryOptions();
  const reportTypeLabel =
    reportType === "dog_profile"
      ? "Dog Profile"
      : reportType === "chat_message"
        ? "Message"
        : reportType === "forum_thread"
          ? "Thread Post"
          : reportType === "forum_comment"
            ? "Thread Comment"
            : "Report";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all">
        {/* Paw Print Decoration */}
        <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none">
          <svg
            width="180"
            height="180"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-amber-900"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.22-7.52-3.22 3.22 7.52 3.22-7.52-3.22-7.52-3.22 7.52zM7 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm10 0c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between relative z-10">
          <h2 className="text-2xl font-extrabold text-amber-900">Report {reportTypeLabel}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-12 relative z-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Report Submitted</h3>
            <p className="text-slate-500 mt-2">Thank you for helping keep DaBreeder safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Category */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-900">
                Category *
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-orange-100 bg-white px-4 py-3 text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-0 transition-colors"
                >
                  <option value="">Select a category...</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-orange-400">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-900">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Clear violation of terms..."
                className="w-full rounded-xl border-2 border-orange-100 bg-white px-4 py-3 text-slate-700 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-0 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-900">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about why you're reporting this..."
                className="h-32 w-full resize-none rounded-xl border-2 border-orange-100 bg-white px-4 py-3 text-slate-700 placeholder-slate-400 focus:border-orange-400 focus:outline-none focus:ring-0 transition-colors"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {description.length}/500 characters
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            {/* Note */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs leading-relaxed text-blue-800">
                <span className="font-bold">Note:</span> Our moderation team will review your report
                and take appropriate action. False reports may result in penalties to your account.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl bg-orange-50 px-6 py-3 text-sm font-bold text-amber-900 hover:bg-orange-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !category}
                className="rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg hover:from-orange-500 hover:to-amber-600 disabled:opacity-50 transition-all transform active:scale-95"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

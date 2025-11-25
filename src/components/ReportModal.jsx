import React, { useState } from "react";
import { useReporting } from "../hooks/useReporting";
import { useAuth } from "../hooks/useAuth";
import "./ReportModal.css"; // warm dog-lover theme

/**
 * Reusable Report Modal for reporting dog profiles, chat messages, forum threads, and forum comments
 *
 * @param {boolean} isOpen - Whether modal is open
 * @param {string} reportType - 'dog_profile', 'chat_message', 'forum_thread', or 'forum_comment'
 * @param {Object} targetData - Data about what's being reported
 * @param {Function} onClose - Callback when modal closes
 * @param {Function} onReportSuccess - Callback after successful report
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Report {reportTypeLabel}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-slate-900 font-semibold">Report Submitted</p>
            <p className="text-sm text-slate-500 mt-2">
              Thank you for helping keep DaBreeder safe.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 text-slate-700"
              >
                <option value="">Select a category...</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Clear violation of terms..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 text-slate-700 placeholder:text-slate-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about why you're reporting this..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 text-slate-700 placeholder:text-slate-400 resize-none h-32"
              />
              <p className="text-xs text-slate-500 mt-1">{description.length}/500 characters</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Our moderation team will review your report and take
                appropriate action. False reports may result in penalties to your account.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !category}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
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

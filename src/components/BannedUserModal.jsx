import React from "react";

/**
 * Modal shown to banned users when they try to access the app
 */
export default function BannedUserModal({ user, onLogout }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 6a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <p className="text-slate-600 mb-4">Your DaBreeder account has been suspended.</p>

          {/* Ban Reason */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-red-600 mb-2">REASON FOR SUSPENSION:</p>
            <p className="text-sm text-red-900">
              {user.banReason || "Your account has been suspended"}
            </p>
          </div>

          {/* Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              If you believe this is a mistake, please contact our support team at{" "}
              <a
                href="mailto:support@dabreeder.com"
                className="font-semibold underline hover:text-blue-700"
              >
                support@dabreeder.com
              </a>
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

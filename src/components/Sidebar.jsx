import React from "react";
import { Link } from "react-router-dom";

function NavItem({ icon, label, onClick, active, danger, disabled, to }) {
  const baseClasses = `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
    disabled ? "text-slate-400 cursor-not-allowed" : "hover:bg-slate-100"
  } ${
    danger
      ? "text-rose-600 hover:text-rose-700"
      : active
      ? "text-slate-900"
      : "text-slate-700"
  }`;

  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} className={baseClasses}>
        <span className="size-5 text-slate-900">{icon}</span>
        <span className="flex-1">{label}</span>
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={baseClasses}>
      <span className="size-5 text-slate-900">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

export default function Sidebar({ open, onClose, user, onLogout }) {
  const loggedIn = !!user;

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        className={`absolute left-0 top-0 h-full w-[280px] sm:w-[320px] bg-white shadow-xl border-r border-slate-200 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4">
          {loggedIn ? (
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="size-10 rounded-full object-cover"
              />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  {user.role}
                </div>
                <div className="font-medium text-slate-900">{user.name}</div>
                {user.id && (
                  <div
                    className="text-[10px] text-slate-500 mt-0.5"
                    title={user.id}
                  >
                    ID: {String(user.id).slice(0, 8)}…
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-sm">
              <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                ?
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  You are signed out
                </div>
                <p className="text-slate-600">
                  Please sign in to access your dashboard.
                </p>
              </div>
            </div>
          )}
          <hr className="mt-4 border-slate-200" />
        </div>

        {/* Main */}
        <div className="px-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            Main
          </div>
          <nav className="grid gap-1">
            <NavItem
              label="Home"
              icon={<HomeIcon />}
              to="/"
              onClick={onClose}
            />
            <NavItem
              label="Dashboard"
              icon={<UserIcon />}
              to="/dashboard"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="Add Dog"
              icon={<ChatIcon />}
              to="/add-dog"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="About"
              icon={<DocIcon />}
              to="/about"
              onClick={onClose}
            />
            <NavItem
              label="Contact"
              icon={<DocIcon />}
              to="/contact"
              onClick={onClose}
            />
          </nav>
        </div>

        {/* Settings */}
        <div className="mt-8 px-4">
          <hr className="border-slate-300" />
          <div className="mt-3 text-[10px] uppercase tracking-wider text-slate-500 mb-2">
            Settings
          </div>
          <div className="flex items-center">
            <NavItem label="Settings" icon={<CogIcon />} disabled={!loggedIn} />
            <span className="-ml-8 mr-4 text-slate-500">
              <ChevronDownIcon />
            </span>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-auto px-4 pb-6 absolute bottom-0 left-0 right-0">
          <NavItem label="Help" icon={<HelpIcon />} />
          {loggedIn ? (
            <NavItem
              label="Logout Account"
              icon={<LogoutIcon />}
              danger
              onClick={onLogout}
            />
          ) : (
            <p className="text-xs text-slate-500 px-3 py-2">
              Sign in from the top bar to unlock all features.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

// Icons (inline SVGs to avoid extra deps)
function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m3 9 9-6 9 6v10.5A1.5 1.5 0 0 1 19.5 21h-15A1.5 1.5 0 0 1 3 19.5V9Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <circle cx="12" cy="7" r="3.5" />
      <path strokeLinecap="round" d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-1.243-1.007-2.25-2.25-2.25H5.25C4.007 6 3 7.007 3 8.25v7.5C3 17.993 4.007 19 5.25 19H9l3.75 3 3.75-3h2.25A2.25 2.25 0 0 0 21 15.75v-7.5Z"
      />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3.75h6.75L19.5 9.5V20.25A2.25 2.25 0 0 1 17.25 22.5H7A2.25 2.25 0 0 1 4.75 20.25V6A2.25 2.25 0 0 1 7 3.75Z"
      />
      <path strokeLinecap="round" d="M13.5 3.75V9h5.5" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 3h4l1 2.5 2.5 1 2.5 4-2.5 4-2.5 1L14 21h-4l-1-2.5-2.5-1L4 14.5l2.5-4 2.5-1L10 3Z"
        opacity=".2"
      />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        strokeLinecap="round"
        d="M9.75 9.75a2.25 2.25 0 1 1 3.9 1.5c-.6.6-1.35.9-1.65 1.8v.45"
      />
      <circle cx="12" cy="17" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6.75V4.5A1.5 1.5 0 0 0 14.25 3h-7.5A1.5 1.5 0 0 0 5.25 4.5v15A1.5 1.5 0 0 0 6.75 21h7.5a1.5 1.5 0 0 0 1.5-1.5v-2.25"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8.25 15.75 12 12 15.75M15.75 12h-9"
      />
    </svg>
  );
}

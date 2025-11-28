import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import "./Sidebar.css"; // warm dog-lover theme
import supabase from "../lib/supabaseClient";

function NavItem({ icon, label, onClick, active, danger, disabled, to, badge }) {
  const baseClasses = `sidebar-nav-item ${
    disabled ? "disabled" : active ? "active" : danger ? "danger" : ""
  }`;
  const showBadge = typeof badge === "number" ? badge > 0 : Boolean(badge);
  const badgeValue = typeof badge === "number" ? badge : badge;

  const content = (
    <>
      <span className="sidebar-icon">{icon}</span>
      <span className="flex-1">{label}</span>
      {showBadge && (
        <span className="ml-auto inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
          {badgeValue}
        </span>
      )}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={baseClasses}>
      {content}
    </button>
  );
}

export default function Sidebar({ open, onClose, user, onLogout }) {
  const loggedIn = !!user;
  const containerRef = useRef(null);
  const [counts, setCounts] = useState({ notifications: 0, chat: 0 });

  useEffect(() => {
    if (!user?.id) return;

    const fetchCounts = async () => {
      try {
        // Notifications count
        const { count: notifCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);

        // Chat count - try read_at first, fallback to is_read
        let chatCount = 0;
        const { count: msgCount, error: msgError } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .neq("sender_id", user.id)
          .is("read_at", null);

        if (!msgError) {
          chatCount = msgCount || 0;
        } else {
          // Fallback to is_read
          const { count: msgCount2 } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .neq("sender_id", user.id)
            .eq("is_read", false);
          chatCount = msgCount2 || 0;
        }

        setCounts({
          notifications: notifCount || 0,
          chat: chatCount,
        });
      } catch (err) {
        console.error("Error fetching sidebar badges:", err);
      }
    };

    fetchCounts();

    // Set up an interval to refresh counts periodically (e.g., every 30 seconds)
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // When the sidebar closes, ensure no element inside remains focused
  useEffect(() => {
    if (!open && containerRef.current) {
      const active = document.activeElement;
      if (active && containerRef.current.contains(active)) {
        if (typeof active.blur === "function") active.blur();
        // Optionally move focus to the main content region if present
        const main = document.querySelector("main, [role='main']");
        if (main && typeof main.focus === "function") {
          // Temporarily make it focusable if not already
          const prevTabIndex = main.getAttribute("tabindex");
          if (!prevTabIndex) main.setAttribute("tabindex", "-1");
          main.focus();
          // Clean up tabindex if we added it
          if (!prevTabIndex) {
            // Allow next tick to keep focus, then remove
            setTimeout(() => main.removeAttribute("tabindex"), 0);
          }
        }
      }
    }
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-60 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 sidebar-scrim transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        className={`sidebar-panel absolute left-0 top-0 h-full w-[280px] sm:w-[320px] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sidebar-header">
          {loggedIn ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="size-12 rounded-full object-cover ring-2 ring-orange-200 shadow-md"
                />
                <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-green-500 rounded-full ring-2 ring-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="sidebar-user-role">{user.role}</div>
                <div className="sidebar-user-name truncate">{user.name}</div>
                {user.id && (
                  <div className="sidebar-user-id mt-0.5" title={user.id}>
                    ID: {String(user.id).slice(0, 8)}…
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-sm">
              <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-semibold text-lg shadow-sm">
                ?
              </div>
              <div className="flex-1">
                <div className="sidebar-user-name">You are signed out</div>
                <p className="text-orange-800/70 text-xs mt-1">
                  Please sign in to access your dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="px-4 py-4">
          <div className="sidebar-section-title">Main</div>
          <nav className="grid gap-1.5">
            <NavItem
              label="My Dogs"
              icon={<PawIcon />}
              to="/my-dog"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="Add Dogs"
              icon={<PlusIcon />}
              to="/add-dog"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="Find Match"
              icon={<SearchIcon />}
              to="/find-match"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="My Matches"
              icon={<SparklesIcon />}
              to="/my-matches"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="Chat"
              icon={<MessageIcon />}
              to="/chat"
              disabled={!loggedIn}
              onClick={onClose}
              badge={counts.chat}
            />
            <NavItem
              label="Forum"
              icon={<ChatIcon />}
              to="/forum"
              disabled={!loggedIn}
              onClick={onClose}
            />
            <NavItem
              label="Notifications"
              icon={<BellIcon />}
              to="/notifications"
              disabled={!loggedIn}
              onClick={onClose}
              badge={counts.notifications}
            />
          </nav>
          {/* Chat contacts list removed per user request (now only visible on Chat page) */}
        </div>

        {/* Settings */}
        <div className="px-4 py-4">
          <hr className="border-orange-200/50 mb-4" />
          <div className="sidebar-section-title">Settings</div>
          <nav className="grid gap-1.5">
            <NavItem
              label="Change Password"
              icon={<PasswordIcon />}
              to="/change-password"
              disabled={!loggedIn}
              onClick={onClose}
            />
          </nav>
        </div>

        {/* Bottom */}
        <div className="mt-auto px-4 pb-6 absolute bottom-0 left-0 right-0 sidebar-bottom">
          {loggedIn ? (
            <NavItem label="Logout Account" icon={<LogoutIcon />} danger onClick={onLogout} />
          ) : (
            <p className="text-xs text-orange-800/70 px-4 py-3 bg-orange-50 rounded-lg border border-orange-100">
              Sign in from the top bar to unlock all features.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

// Icons (inline SVGs to avoid extra deps)

// Bell icon for notifications
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 0 1-6 0v-1m6 0H9"
      />
    </svg>
  );
}

// Search icon for Find Match
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
    </svg>
  );
}

// Sparkles icon for My Matches
function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 5.146a.75.75 0 0 1 1.374 0l1.33 3.08a.75.75 0 0 0 .421.421l3.08 1.33a.75.75 0 0 1 0 1.374l-3.08 1.33a.75.75 0 0 0-.421.421l-1.33 3.08a.75.75 0 0 1-1.374 0l-1.33-3.08a.75.75 0 0 0-.421-.421l-3.08-1.33a.75.75 0 0 1 0-1.374l3.08-1.33a.75.75 0 0 0 .421-.421l1.33-3.08Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.813 13.146a.75.75 0 0 1 1.374 0l.741 1.716a.75.75 0 0 0 .421.421l1.716.741a.75.75 0 0 1 0 1.374l-1.716.741a.75.75 0 0 0-.421.421l-.741 1.716a.75.75 0 0 1-1.374 0l-.741-1.716a.75.75 0 0 0-.421-.421l-1.716-.741a.75.75 0 0 1 0-1.374l1.716-.741a.75.75 0 0 0 .421-.421l.741-1.716Z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <circle cx="12" cy="7" r="3.5" />
      <path strokeLinecap="round" d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-1.243-1.007-2.25-2.25-2.25H5.25C4.007 6 3 7.007 3 8.25v7.5C3 17.993 4.007 19 5.25 19H9l3.75 3 3.75-3h2.25A2.25 2.25 0 0 0 21 15.75v-7.5Z"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9.5L5 19.5V7a2 2 0 0 1 2-2Z"
      />
      <path strokeLinecap="round" d="M8 10h8M8 13h5" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
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

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <circle cx="12" cy="12" r="9" opacity=".15" />
      <path strokeLinecap="round" d="M12 7v10M7 12h10" />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <ellipse cx="9" cy="7" rx="1.5" ry="2" />
      <ellipse cx="15" cy="7" rx="1.5" ry="2" />
      <ellipse cx="6" cy="11" rx="1.5" ry="2" />
      <ellipse cx="18" cy="11" rx="1.5" ry="2" />
      <ellipse cx="12" cy="16" rx="3" ry="2.5" />
    </svg>
  );
}

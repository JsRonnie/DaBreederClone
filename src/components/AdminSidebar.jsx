import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

function NavItem({ icon, label, to, onClick, active, badge, danger }) {
  const baseClasses = `w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
    danger
      ? "text-rose-600 hover:bg-rose-50"
      : active
        ? "bg-slate-100 text-slate-900"
        : "text-slate-600 hover:bg-slate-100"
  }`;
  const showBadge = typeof badge === "number" ? badge > 0 : Boolean(badge);
  const badgeValue = typeof badge === "number" ? badge : badge;

  return (
    <Link to={to} onClick={onClick} className={baseClasses}>
      <span className="size-5 text-slate-900">{icon}</span>
      <span className="flex-1">{label}</span>
      {showBadge && (
        <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {badgeValue}
        </span>
      )}
    </Link>
  );
}

export default function AdminSidebar({ open, onClose, adminUser, onSignOut, counters = {} }) {
  const location = useLocation();
  const containerRef = useRef(null);
  const loggedIn = Boolean(adminUser);

  useEffect(() => {
    if (!open && containerRef.current) {
      const active = document.activeElement;
      if (active && containerRef.current.contains(active) && typeof active.blur === "function") {
        active.blur();
      }
    }
  }, [open]);

  const navSections = [
    {
      title: "Overview",
      items: [
        {
          label: "Dashboard",
          to: "/admin/dashboard",
          icon: <DashboardIcon />,
          match: ["/admin/dashboard"],
        },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Users", to: "/admin/users", icon: <UsersIcon />, match: ["/admin/users"] },
        { label: "Dog Profiles", to: "/admin/dogs", icon: <DogsIcon />, match: ["/admin/dogs"] },
        // ...existing code...
        { label: "Forum", to: "/admin/forum", icon: <ForumIcon />, match: ["/admin/forum"] },
        {
          label: "Messages",
          to: "/admin/messages",
          icon: <InboxIcon />,
          match: ["/admin/messages"],
          badge: counters.pendingMessages,
        },
      ],
    },
    {
      title: "Monitoring",
      items: [
        {
          label: "Reports",
          to: "/admin/reports",
          icon: <ReportsIcon />,
          match: ["/admin/reports"],
          badge: counters.pendingReports,
        },
        // ...existing code...
      ],
    },
    ...(loggedIn
      ? [
          {
            title: "Account",
            items: [
              {
                label: "Log out",
                icon: <LogoutIcon />,
                danger: true,
                onClick: onSignOut,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-70 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        className={`absolute left-0 top-0 h-full w-[280px] sm:w-[320px] bg-white shadow-xl border-r border-slate-200 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-4 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <ShieldIcon />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Administrator</p>
              <p className="text-base font-semibold text-slate-900">{adminUser?.name || "Admin"}</p>
              <p className="text-xs text-slate-500 truncate max-w-40">{adminUser?.email || "—"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-160px)] overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="px-4 py-5 border-b border-slate-100">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">
                {section.title}
              </p>
              <div className="grid gap-1">
                {section.items.map((item) => {
                  const paths = item.match || [item.to];
                  const isActive = paths.some((path) => location.pathname.startsWith(path));
                  return (
                    <NavItem
                      key={item.label}
                      {...item}
                      active={isActive}
                      onClick={onClose}
                      danger={item.danger}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto px-4 py-5 border-t border-slate-200 space-y-2">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100"
          >
            <span className="flex items-center gap-3">
              <HelpIcon />
              Support Center
            </span>
            <span className="text-xs text-slate-400">Shift + ?</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 7h8m-8 10h4m5-10h7v12h-7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372A9.337 9.337 0 0021.746 18a4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766V19.125a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0A3.375 3.375 0 0112 6.375zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function DogsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12c0-3 2-6 7-6s7 3 7 6-2 6-7 6c-1 0-2-.5-3-1.2L7 18l.5-2.5C6 14.4 5 13 5 12Z"
      />
      <circle cx="9" cy="11" r="1" />
      <circle cx="15" cy="11" r="1" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14H7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4h4" />
      <path strokeLinecap="round" d="M9 12h6M9 16h3" />
    </svg>
  );
}

function ForumIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4l-2.5-3h-3L9 19H5a2 2 0 01-2-2V7z"
      />
      <path strokeLinecap="round" d="M7 10h10M7 13h6" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14v18H5z" />
      <path strokeLinecap="round" d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.75 9.75a2.25 2.25 0 113.9 1.5c-.6.6-1.35.9-1.65 1.8v.45" />
      <circle cx="12" cy="17" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6.75V4.5A1.5 1.5 0 0014.25 3h-7.5A1.5 1.5 0 005.25 4.5v15A1.5 1.5 0 006.75 21h7.5a1.5 1.5 0 001.5-1.5v-2.25"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8.25 15.75 12 12 15.75M15.75 12h-9"
      />
    </svg>
  );
}

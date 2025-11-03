import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar({
  onMenuClick,
  onSignInClick,
  onSignUpClick,
  user,
}) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b border-slate-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left: Hamburger menu for all users */}
        <div className="flex items-center">
          <button
            aria-label="Open menu"
            className="p-2 rounded-md hover:bg-slate-100 text-slate-700 mr-2"
            onClick={user ? () => onMenuClick && onMenuClick() : toggle}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M3.75 5.25A.75.75 0 0 1 4.5 4.5h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 7.5a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm.75 6.75a.75.75 0 0 0 0 1.5h15a.75.75 0 0 0 0-1.5h-15Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {/* Center: DaBreeder Logo - navigate based on login status */}
        <div className="flex items-center justify-center flex-1">
          <Link
            to={user ? "/my-dog" : "/"}
            className="font-bold text-2xl text-slate-800 hover:opacity-80 transition-opacity"
          >
            <span className="text-blue-600">Da</span>
            <span>Breeder</span>
          </Link>
        </div>{" "}
        {/* Right: show auth only when logged out, dashboard when logged in */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <button
                onClick={onSignInClick}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Sign In
              </button>
              <button
                onClick={onSignUpClick}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign Up
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {/* User indicator - could add user avatar or name here */}
            </div>
          )}
        </div>
      </nav>

      {/* Dropdown menu for all users */}
      {open && (
        <div className="border-t border-slate-200 bg-white shadow-lg">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 text-sm text-slate-600 grid gap-2">
            {user ? (
              <>
                <Link
                  to="/my-dog"
                  onClick={() => setOpen(false)}
                  className="text-left hover:text-slate-900 transition-colors"
                >
                  My Dogs
                </Link>
                <Link
                  to="/find-match"
                  onClick={() => setOpen(false)}
                  className="text-left hover:text-slate-900 transition-colors"
                >
                  Find Match
                </Link>
                <Link
                  to="/forum"
                  onClick={() => setOpen(false)}
                  className="text-left hover:text-slate-900 transition-colors"
                >
                  Forum
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="text-left hover:text-slate-900 transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  onClick={() => setOpen(false)}
                  className="text-left hover:text-slate-900 transition-colors"
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setOpen(false)}
                  className="text-left hover:text-slate-900 transition-colors"
                >
                  Contact
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

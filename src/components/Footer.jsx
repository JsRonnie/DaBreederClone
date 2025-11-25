import React from "react";
import "./Footer.css"; // warm dog-lover theme

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {/* Brand */}
          <div className="font-semibold text-2xl">
            <span className="text-blue-400">Da</span>
            <span>Breeder</span>
          </div>

          {/* Description */}
          <p className="text-slate-300 text-base leading-relaxed max-w-2xl">
            Connecting responsible dog breeders through dog traits matching, health record
            verification, and community support.
          </p>

          {/* Copyright */}
          <div className="pt-6 border-t border-slate-700 w-full">
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} DaBreeder. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

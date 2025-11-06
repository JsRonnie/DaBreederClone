// Simple cookie helpers and a React hook for convenience
// Usage:
//   setCookie('sort', 'hot', { days: 30 })
//   const v = getCookie('sort')
//   deleteCookie('sort')
//
// React:
//   const [sort, setSortCookie] = useCookie('sort', 'new', { days: 30 })

export function setCookie(name, value, options = {}) {
  if (typeof document === "undefined") return;
  const {
    days, // convenience to set expires via days
    maxAge, // seconds
    path = "/",
    domain,
    secure,
    sameSite = "Lax",
    expires, // Date or string
  } = options;

  let cookie =
    encodeURIComponent(name) + "=" + encodeURIComponent(String(value));

  if (typeof maxAge === "number") cookie += `; Max-Age=${Math.floor(maxAge)}`;
  if (days && !expires && !maxAge) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    cookie += `; Expires=${d.toUTCString()}`;
  } else if (expires instanceof Date) {
    cookie += `; Expires=${expires.toUTCString()}`;
  } else if (typeof expires === "string") {
    cookie += `; Expires=${expires}`;
  }

  if (path) cookie += `; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += "; Secure";
  if (sameSite) cookie += `; SameSite=${sameSite}`;

  document.cookie = cookie;
}

export function getCookie(name) {
  if (typeof document === "undefined") return null;
  const cname = encodeURIComponent(name) + "=";
  const parts = (document.cookie || "").split(/;\s*/);
  for (const part of parts) {
    if (!part) continue;
    if (part.indexOf(cname) === 0) {
      return decodeURIComponent(part.substring(cname.length));
    }
    // Handle cookies without encoding as a fallback
    const [k, ...rest] = part.split("=");
    if (k && k.trim() === name) return rest.join("=");
  }
  return null;
}

export function deleteCookie(name, options = {}) {
  if (typeof document === "undefined") return;
  const { path = "/", domain } = options;
  // Set expiration in the past
  let cookie =
    encodeURIComponent(name) +
    "=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=" +
    path;
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
}

// Optional React hook to sync a cookie with state
import React from "react";
export function useCookie(name, defaultValue = null, options = {}) {
  const [value, setValue] = React.useState(() => {
    const v = getCookie(name);
    return v != null ? v : defaultValue;
  });

  const set = React.useCallback(
    (next) => {
      const v = typeof next === "function" ? next(value) : next;
      setValue(v);
      if (v == null) deleteCookie(name, options);
      else setCookie(name, v, options);
    },
    [name, options, value]
  );

  React.useEffect(() => {
    // In case other tabs update the cookie via document.cookie, we can't get an event.
    // Poll infrequently only when absolutely needed. Disabled by default to avoid overhead.
    // Users can manually refresh or we can add a "sync" call if needed later.
  }, []);

  return [value, set];
}

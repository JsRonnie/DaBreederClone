// Lightweight cache with optional persistence and TTL per entry.
// Example:
//   import { createCache } from './cache'
//   const dogsCache = createCache('dogs', { storage: 'memory', defaultTTL: 15 * 60_000 })
//   dogsCache.set('my', rows)
//   const rows = dogsCache.get('my')

const GLOBAL_NAMESPACE = "__APP_CACHES__";

function now() {
  return Date.now();
}

function pickStorage(kind) {
  try {
    if (kind === "localStorage") return window.localStorage;
    if (kind === "sessionStorage") return window.sessionStorage;
  } catch {
    /* SSR or disabled storage */
  }
  return null;
}

export class Cache {
  constructor(name, { storage = "memory", defaultTTL = 0 } = {}) {
    this.name = String(name || "cache");
    this.defaultTTL = Number(defaultTTL || 0);
    this.kind = storage; // 'memory' | 'localStorage' | 'sessionStorage'
    this.store = new Map();
    this.backing = pickStorage(storage);
    this.prefix = `${GLOBAL_NAMESPACE}:${this.name}::`;

    if (this.backing) this._loadFromBacking();

    // Sync across tabs via storage events
    if (this.backing) {
      window.addEventListener("storage", (e) => {
        if (!e.key || !e.key.startsWith(this.prefix)) return;
        const key = e.key.slice(this.prefix.length);
        if (e.newValue == null) this.store.delete(key);
        else {
          try {
            const record = JSON.parse(e.newValue);
            this.store.set(key, record);
          } catch {
            // ignore
          }
        }
      });
    }
  }

  _loadFromBacking() {
    try {
      for (let i = 0; i < this.backing.length; i++) {
        const k = this.backing.key(i);
        if (!k || !k.startsWith(this.prefix)) continue;
        const key = k.slice(this.prefix.length);
        const raw = this.backing.getItem(k);
        if (!raw) continue;
        try {
          const record = JSON.parse(raw);
          this.store.set(key, record);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  _write(key, record) {
    if (!this.backing) return;
    try {
      this.backing.setItem(this.prefix + key, JSON.stringify(record));
    } catch {
      // quota or JSON error; ignore silently
    }
  }

  _remove(key) {
    if (!this.backing) return;
    try {
      this.backing.removeItem(this.prefix + key);
    } catch {
      // ignore
    }
  }

  get(key) {
    const r = this.store.get(key);
    if (!r) return null;
    if (r.e && r.e > 0 && r.e < now()) {
      this.store.delete(key);
      this._remove(key);
      return null;
    }
    return r.v;
  }

  getWithMeta(key) {
    const r = this.store.get(key);
    if (!r) return null;
    if (r.e && r.e > 0 && r.e < now()) {
      this.store.delete(key);
      this._remove(key);
      return null;
    }
    return { value: r.v, expiresAt: r.e || 0, storedAt: r.t || 0 };
  }

  set(key, value, { ttl } = {}) {
    const t = now();
    const e =
      Number.isFinite(ttl ?? this.defaultTTL) && (ttl ?? this.defaultTTL) > 0
        ? t + (ttl ?? this.defaultTTL)
        : 0;
    const record = { v: value, t, e };
    this.store.set(key, record);
    this._write(key, record);
    return value;
  }

  delete(key) {
    this.store.delete(key);
    this._remove(key);
  }

  clear() {
    this.store.clear();
    if (this.backing) {
      try {
        // remove all keys for this cache only
        const keys = [];
        for (let i = 0; i < this.backing.length; i++) {
          const k = this.backing.key(i);
          if (k && k.startsWith(this.prefix)) keys.push(k);
        }
        for (const k of keys) this.backing.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  }

  prune() {
    // Remove expired entries
    const t = now();
    for (const [k, r] of this.store) {
      if (r.e && r.e > 0 && r.e < t) {
        this.store.delete(k);
        this._remove(k);
      }
    }
  }

  keys() {
    return Array.from(this.store.keys());
  }

  size() {
    return this.store.size;
  }
}

export function createCache(name, opts) {
  return new Cache(name, opts);
}

import React from "react";
import { Link } from "react-router-dom";
import "../styles.css";

export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 72, margin: 0 }}>404</h1>
        <p style={{ fontSize: 20, color: '#475569' }}>Page not found</p>
        <p style={{ color: '#6b7280' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#06b6d4', color: 'white', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              Go home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

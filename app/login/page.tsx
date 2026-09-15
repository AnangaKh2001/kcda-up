"use client";

import { useEffect, useState } from "react";
import "./login.css";

const ERRORS: Record<string, string> = {
  oauth_config: "Konfigurasi Google OAuth belum lengkap.",
  oauth_state: "Permintaan login tidak valid atau sudah kedaluwarsa.",
  oauth_denied: "Login Google dibatalkan.",
  email_denied: "Email Google ini tidak memiliki akses ke KCDA Up!",
  oauth_failed: "Login Google gagal. Silakan coba kembali.",
};

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error") || "";
    setError(ERRORS[code] || "");
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <div className="brand">
          <span className="brand-mark">K</span>
          <span>
            KCDA <b>Up!</b>
          </span>
        </div>
        <p className="eyebrow">BPS KABUPATEN</p>
        <h1>Publikasi Kecamatan Dalam Angka, lebih cepat dan rapi.</h1>
        <p className="muted">
          Satu ruang kerja untuk menyiapkan data dan menerbitkan KCDA secara
          konsisten.
        </p>
        <div className="auth-orbs">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="login-card">
        <p className="eyebrow">AREA ADMIN</p>
        <h2>Selamat datang</h2>
        <p>Masuk dengan akun Google yang telah diberi akses.</p>
        {error && <div className="error">{error}</div>}
        <a
          className="primary google-login"
          href="/api/auth/google"
          onClick={() => setLoading(true)}
        >
          <span aria-hidden="true">G</span>
          {loading ? "Menghubungkan ke Google..." : "Masuk dengan Google"}
        </a>
        <small>Hanya untuk pengguna yang berwenang.</small>
      </section>
    </main>
  );
}

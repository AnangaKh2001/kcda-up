"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Login gagal");
      router.replace("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Login gagal"); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><section className="auth-copy"><div className="brand"><span className="brand-mark">K</span><span>KCDA <b>Up!</b></span></div><p className="eyebrow">BPS KABUPATEN</p><h1>Publikasi Kecamatan Dalam Angka, lebih cepat dan rapi.</h1><p className="muted">Satu ruang kerja untuk menyiapkan data dan menerbitkan KCDA secara konsisten.</p><div className="auth-orbs"><span /><span /><span /></div></section><section className="login-card"><p className="eyebrow">AREA ADMIN</p><h2>Selamat datang</h2><p>Masuk untuk mengelola proses publikasi KCDA.</p><form onSubmit={login}><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Masukkan username" /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Masukkan password" /></label>{error ? <div className="error">{error}</div> : null}<button className="primary" disabled={loading}>{loading ? "Memeriksa..." : "Masuk ke KCDA Up!"}</button></form><small>Hanya untuk pengguna yang berwenang.</small></section></main>;
}

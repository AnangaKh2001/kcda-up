import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KCDA Up! | Publikasi Kecamatan Dalam Angka",
  description: "Workspace pembuatan publikasi Kecamatan Dalam Angka"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}

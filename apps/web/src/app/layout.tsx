import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tango",
  description: "Catalogo y resenas de videojuegos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-bg font-sans text-text`}>
        <AuthProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
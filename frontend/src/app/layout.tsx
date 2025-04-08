import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/AuthProvider"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpendAI",
  description: "Your personalised financial companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { GradientBackground } from "@/components/ui/bloom-field-gradient";
import { Auth, AuthView } from "@/components/auth/Auth";

export default function LoginPage() {
  return (
    <main
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Bloom Field Gradient Background */}
      <GradientBackground className="absolute inset-0 w-full h-full" />

      {/* Auth Content Area */}
      <div
        className="relative z-20 w-full max-w-md flex flex-col items-center gap-5"
        style={{
          position: "relative",
          zIndex: 20,
          width: "100%",
          maxWidth: "440px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          margin: "0 auto",
        }}
      >
        {/* Brand Header */}
        <Link
          href="/"
          className="flex items-center gap-2.5 no-underline text-slate-900 transition-transform hover:scale-105"
        >
          <img
            src="/logo.png"
            alt="Proctors Logo"
            className="w-10 h-10 rounded-xl shadow-md object-contain bg-white p-1"
          />
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            Proctors
          </span>
        </Link>

        {/* Multi-view Auth Card */}
        <Auth initialView={AuthView.SIGN_IN} className="w-full" />

        {/* Institutional Trust Note */}
        <p className="text-xs text-slate-500 font-medium text-center">
          Secure, Single-Tenant Institutional Academic Platform
        </p>
      </div>
    </main>
  );
}

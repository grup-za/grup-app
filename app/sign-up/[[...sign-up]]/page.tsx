"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8"
      style={{ backgroundColor: "#F5E6C8" }}
    >
      <h1 className="text-5xl font-bold" style={{ color: "#0D4A2A" }}>
        Grüp
      </h1>
      <SignUp />
    </main>
  );
}

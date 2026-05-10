import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
      style={{ backgroundColor: "#F5E6C8" }}
    >
      <h1 className="text-4xl font-bold" style={{ color: "#0D4A2A" }}>
        Welcome to Grüp
      </h1>
      <p className="text-xl" style={{ color: "#0D4A2A" }}>
        Hello, {user.firstName}!
      </p>
      <SignOutButton>
        <button
          className="rounded-lg px-6 py-3 text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#0D4A2A" }}
        >
          Sign out
        </button>
      </SignOutButton>
    </main>
  );
}

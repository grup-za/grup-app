import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: defaultAccount } = await supabase
    .from("payout_accounts")
    .select("id, display_name, bank_name")
    .eq("clerk_user_id", user.id)
    .eq("is_default", true)
    .maybeSingle();

  return (
    <div style={{ backgroundColor: "#F5E6C8" }} className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{ color: "#0D4A2A" }}
            >
              Welcome back, {user.firstName}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#0D4A2A" }}>
              What do you want to get paid for today?
            </p>
          </div>
          <UserMenu imageUrl={user.imageUrl} />
        </div>

        {/* Payment account section */}
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#0D4A2A" }}
          >
            Payment account
          </h2>

          {defaultAccount ? (
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="font-semibold text-sm" style={{ color: "#0D4A2A" }}>
                  {defaultAccount.display_name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {defaultAccount.bank_name}
                </p>
              </div>
              <Link
                href="/dashboard/accounts/new"
                className="text-xs font-medium underline underline-offset-2"
                style={{ color: "#0D4A2A" }}
              >
                Change
              </Link>
            </div>
          ) : (
            <div
              className="bg-white rounded-2xl p-5 border-2 shadow-sm"
              style={{ borderColor: "#D97706" }}
            >
              <p className="text-sm font-medium text-gray-700 mb-4">
                No payment account linked
              </p>
              <Link href="/dashboard/accounts/new">
                <button
                  className="rounded-xl px-4 py-2 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#0D4A2A" }}
                >
                  Link payment account
                </button>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

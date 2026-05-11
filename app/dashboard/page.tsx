import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";

// ─── Types ────────────────────────────────────────────────────────────────────

type PayerSummary = {
  id: string;
  payment_status: string;
  paid_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  total_amount: number;
  amount_mode: string;
  status: string;
  created_at: string;
  payment_event_payers: PayerSummary[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

function isCompleted(event: EventRow) {
  if (event.status === "completed") return true;
  const p = event.payment_event_payers;
  return p.length > 0 && p.every((x) => x.payment_status === "paid");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();

  // Run all three queries in parallel
  const [
    { data: defaultAccount },
    { data: activeEventsRaw },
    { data: recentEventsRaw },
  ] = await Promise.all([
    supabase
      .from("payout_accounts")
      .select("id, display_name, bank_name")
      .eq("clerk_user_id", user.id)
      .eq("is_default", true)
      .maybeSingle(),

    supabase
      .from("payment_events")
      .select(
        `id, title, total_amount, amount_mode, status, created_at,
         payment_event_payers(id, payment_status)`
      )
      .eq("clerk_user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("payment_events")
      .select(
        `id, title, total_amount, amount_mode, status, created_at,
         payment_event_payers(id, payment_status, paid_at)`
      )
      .eq("clerk_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const activeEvents = (activeEventsRaw ?? []) as EventRow[];
  const completedEvents = ((recentEventsRaw ?? []) as EventRow[])
    .filter(isCompleted)
    .slice(0, 5);

  return (
    <div style={{ backgroundColor: "#F5E6C8" }} className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: "#0D4A2A" }}>
              Welcome back, {user.firstName}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#0D4A2A" }}>
              What do you want to get paid for today?
            </p>
          </div>
          <UserMenu imageUrl={user.imageUrl} />
        </div>

        {/* Payment account */}
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
                <p className="text-xs text-gray-500 mt-0.5">{defaultAccount.bank_name}</p>
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

        {/* Active events */}
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#0D4A2A" }}
          >
            Active events
          </h2>

          {activeEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
              <p className="text-sm text-gray-500">No active payment events.</p>
              <p className="text-xs text-gray-400">
                Create your first one to get started.
              </p>
              <Link href="/dashboard/events/new">
                <button
                  className="rounded-xl px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#0D4A2A" }}
                >
                  Create payment event
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeEvents.map((event) => {
                const total = event.payment_event_payers.length;
                const paid = event.payment_event_payers.filter(
                  (p) => p.payment_status === "paid"
                ).length;
                const ratio = total > 0 ? paid / total : 0;

                return (
                  <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#0D4A2A" }}>
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          R{fmt(event.total_amount)} total · Created {fmtDate(event.created_at)}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border-2 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#0D4A2A", color: "#0D4A2A" }}
                      >
                        View
                      </Link>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "#D4C5A9" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: "#0D4A2A",
                            width: `${ratio * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {paid} of {total} paid
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed events (only shown if any exist) */}
        {completedEvents.length > 0 && (
          <div>
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#0D4A2A" }}
            >
              Recent events
            </h2>
            <div className="space-y-3">
              {completedEvents.map((event) => {
                const payers = event.payment_event_payers;
                const payerCount = payers.length;

                // Use the most recent paid_at as the completion date
                const lastPaidAt = payers
                  .filter((p) => p.paid_at)
                  .sort(
                    (a, b) =>
                      new Date(b.paid_at!).getTime() -
                      new Date(a.paid_at!).getTime()
                  )[0]?.paid_at;
                const completedDate = lastPaidAt ?? event.created_at;

                const repeatUrl = `/dashboard/events/new?title=${encodeURIComponent(event.title)}&amount=${event.total_amount}&mode=${event.amount_mode}`;

                return (
                  <div key={event.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#0D4A2A" }}>
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          R{fmt(event.total_amount)} · {payerCount} payer
                          {payerCount !== 1 ? "s" : ""} · Completed{" "}
                          {fmtDate(completedDate)}
                        </p>
                      </div>
                      <Link
                        href={repeatUrl}
                        className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold border-2 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#0D4A2A", color: "#0D4A2A" }}
                      >
                        Repeat
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create event CTA */}
        <Link href="/dashboard/events/new">
          <button
            className="w-full rounded-2xl px-4 py-4 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-sm"
            style={{ backgroundColor: "#0D4A2A" }}
          >
            + Create payment event
          </button>
        </Link>

      </div>
    </div>
  );
}

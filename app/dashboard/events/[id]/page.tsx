import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type Payer = {
  id: string;
  name: string;
  phone_number: string;
  amount_owed: number;
  payment_status: string;
  payment_token: string;
  paid_at: string | null;
};

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  total_amount: number;
  amount_mode: string;
  status: string;
  created_at: string;
  payout_accounts: { display_name: string } | null;
  payment_event_payers: Payer[];
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
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildWaUrl(
  payer: Payer,
  hostFirstName: string,
  eventTitle: string,
  amountMode: string
) {
  const waPhone = `27${payer.phone_number.slice(1)}`;
  const payUrl = `https://dev.grup.co.za/pay/${payer.payment_token}`;
  const body =
    amountMode === "open"
      ? `Hi ${payer.name} 👋 ${hostFirstName} has set up a payment for ${eventTitle}. You decide the amount.\n\nTap your secure payment link to pay:\n${payUrl}\n\nPowered by Grüp 🌿`
      : `Hi ${payer.name} 👋 ${hostFirstName} has requested a payment of R${fmt(payer.amount_owed)} for ${eventTitle}.\n\nTap your secure payment link to pay:\n${payUrl}\n\nPowered by Grüp 🌿`;
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(body)}`;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  unpaid:    { label: "Unpaid",    bg: "#FEF3C7", text: "#92400E" },
  paid:      { label: "Paid",      bg: "#D1FAE5", text: "#065F46" },
  failed:    { label: "Failed",    bg: "#FEE2E2", text: "#991B1B" },
  cancelled: { label: "Cancelled", bg: "#F3F4F6", text: "#6B7280" },
};

const EVENT_STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  active:    { label: "Active",    bg: "#D1FAE5", text: "#065F46" },
  completed: { label: "Completed", bg: "#F3F4F6", text: "#6B7280" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", text: "#991B1B" },
};

const AMOUNT_MODE_LABEL: Record<string, string> = {
  equal_split: "Equal split",
  custom: "Custom",
  open: "Open amount",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: eventRaw } = await supabase
    .from("payment_events")
    .select(
      `id, title, description, total_amount, amount_mode, status, created_at,
       payout_accounts(display_name),
       payment_event_payers(
         id, name, phone_number, amount_owed,
         payment_status, payment_token, paid_at
       )`
    )
    .eq("id", id)
    .eq("clerk_user_id", user.id)
    .single();

  if (!eventRaw) redirect("/dashboard");
  const event = eventRaw as unknown as EventDetail;

  const payers = event.payment_event_payers;
  const paidPayers = payers.filter((p) => p.payment_status === "paid");
  const paidCount = paidPayers.length;
  const totalCount = payers.length;
  const collectedAmount = paidPayers.reduce((sum, p) => sum + p.amount_owed, 0);

  const eventBadge = EVENT_STATUS_BADGE[event.status] ?? EVENT_STATUS_BADGE.active;

  return (
    <div style={{ backgroundColor: "#F5E6C8" }} className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Back */}
        <Link
          href="/dashboard"
          className="text-sm font-medium"
          style={{ color: "#0D4A2A" }}
        >
          ← Dashboard
        </Link>

        {/* Heading + status badge */}
        <div className="mt-4 mb-6 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: "#0D4A2A" }}>
            {event.title}
          </h1>
          <span
            className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: eventBadge.bg, color: eventBadge.text }}
          >
            {eventBadge.label}
          </span>
        </div>

        {/* Event details card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total amount</p>
              <p className="font-bold text-lg" style={{ color: "#0D4A2A" }}>
                R{fmt(event.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Split</p>
              <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                {AMOUNT_MODE_LABEL[event.amount_mode] ?? event.amount_mode}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Created</p>
              <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                {fmtDate(event.created_at)}
              </p>
            </div>
            {event.payout_accounts && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Pay into</p>
                <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                  {event.payout_accounts.display_name}
                </p>
              </div>
            )}
          </div>
          {event.description && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Note</p>
              <p className="text-sm text-gray-600">{event.description}</p>
            </div>
          )}
        </div>

        {/* Payer table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#0D4A2A" }}
            >
              Payers
            </h2>
          </div>

          {/* Summary */}
          <div
            className="rounded-xl px-4 py-3 mb-3 text-sm font-medium"
            style={{ backgroundColor: "#E8F5EE", color: "#0D4A2A" }}
          >
            {paidCount} of {totalCount} payer{totalCount !== 1 ? "s" : ""} have paid
            {" — "}R{fmt(collectedAmount)} of R{fmt(event.total_amount)} collected
          </div>

          {/* Payer rows */}
          <div className="space-y-2">
            {payers.map((p) => {
              const badge = STATUS_BADGE[p.payment_status] ?? STATUS_BADGE.unpaid;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#0D4A2A" }}>
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500">{p.phone_number}</p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0D4A2A" }}>
                        {event.amount_mode === "open"
                          ? "Open"
                          : `R${fmt(p.amount_owed)}`}
                      </p>
                      {p.payment_status === "paid" && p.paid_at && (
                        <p className="text-xs text-gray-400">
                          Paid {fmtDateTime(p.paid_at)}
                        </p>
                      )}
                    </div>
                    <a
                      href={buildWaUrl(p, user.firstName ?? "Host", event.title, event.amount_mode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#25D366" }}
                    >
                      💬 Resend
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPaymentEvent } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type AmountMode = "equal_split" | "custom" | "open";

type PayoutAccount = {
  id: string;
  display_name: string;
  bank_name: string;
};

type Payer = {
  localId: string;
  name: string;
  phone: string;
  amountOwed: number;
};

type CreatedPayer = {
  id: string;
  name: string;
  phone_number: string;
  amount_owed: number;
  payment_token: string;
};

type Step4State =
  | { status: "saving" }
  | {
      status: "success";
      event: { id: string; title: string; totalAmount: number };
      payers: CreatedPayer[];
    }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHONE_RE = /^0[678]\d{8}$/;

function fmt(n: number) {
  return n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildWaLink(
  payer: CreatedPayer,
  hostFirstName: string,
  eventTitle: string,
  amountMode: AmountMode
) {
  const waPhone = `27${payer.phone_number.slice(1)}`;
  const payUrl = `https://dev.grup.co.za/pay/${payer.payment_token}`;

  const body =
    amountMode === "open"
      ? `Hi ${payer.name} 👋 ${hostFirstName} has set up a payment for ${eventTitle}. You decide the amount.\n\nTap your secure payment link to pay:\n${payUrl}\n\nPowered by Grüp 🌿`
      : `Hi ${payer.name} 👋 ${hostFirstName} has requested a payment of R${fmt(payer.amount_owed)} for ${eventTitle}.\n\nTap your secure payment link to pay:\n${payUrl}\n\nPowered by Grüp 🌿`;

  return `https://wa.me/${waPhone}?text=${encodeURIComponent(body)}`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900";

const primaryBtn =
  "rounded-xl py-3 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40";

const outlineBtn =
  "rounded-xl py-3 text-sm font-semibold border-2 hover:bg-white/40 transition-colors";

// ─── Component ───────────────────────────────────────────────────────────────

const VALID_MODES: AmountMode[] = ["equal_split", "custom", "open"];

export function EventForm({
  hostFirstName,
  payoutAccounts,
  repeatParams,
}: {
  hostFirstName: string;
  payoutAccounts: PayoutAccount[];
  repeatParams?: { title?: string; amount?: string; mode?: string };
}) {
  const router = useRouter();

  const initMode: AmountMode =
    repeatParams?.mode && VALID_MODES.includes(repeatParams.mode as AmountMode)
      ? (repeatParams.mode as AmountMode)
      : "equal_split";

  const isRepeat = Boolean(repeatParams?.title);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(repeatParams?.title ?? "");
  const [totalAmount, setTotalAmount] = useState(repeatParams?.amount ?? "");
  const [description, setDescription] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>(initMode);
  const [payoutAccountId, setPayoutAccountId] = useState(
    payoutAccounts[0]?.id ?? ""
  );
  const [step1Error, setStep1Error] = useState("");

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [payers, setPayers] = useState<Payer[]>([]);
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payerAmount, setPayerAmount] = useState("");
  const [payerError, setPayerError] = useState("");
  const [contactsSupported, setContactsSupported] = useState(false);

  // ── Step 4 ──────────────────────────────────────────────────────────────────
  const [step4State, setStep4State] = useState<Step4State | null>(null);

  useEffect(() => {
    setContactsSupported(
      "contacts" in navigator &&
        typeof (navigator as any).contacts?.select === "function"
    );
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalAmountNum = parseFloat(totalAmount) || 0;
  const perPerson = payers.length > 0 ? totalAmountNum / payers.length : 0;
  const selectedAccount = payoutAccounts.find((a) => a.id === payoutAccountId);

  // ── Save logic ───────────────────────────────────────────────────────────────
  async function runSave() {
    const amount = totalAmountNum;
    const result = await createPaymentEvent({
      title,
      description,
      totalAmount: amount,
      amountMode,
      payoutAccountId,
      payers: payers.map((p) => ({
        name: p.name,
        phone: p.phone,
        amountOwed:
          amountMode === "equal_split"
            ? parseFloat((amount / payers.length).toFixed(2))
            : amountMode === "open"
            ? 0
            : p.amountOwed,
      })),
    });

    if ("error" in result) {
      setStep4State({ status: "error", message: result.error ?? "An unexpected error occurred" });
    } else {
      setStep4State({
        status: "success",
        event: result.event,
        payers: result.payers,
      });
    }
  }

  function handleConfirmAndCreate() {
    setStep4State({ status: "saving" });
    setStep(4);
    runSave();
  }

  function handleRetry() {
    setStep4State({ status: "saving" });
    runSave();
  }

  // ── Step 1 validation ────────────────────────────────────────────────────────
  function handleStep1Next() {
    if (!title.trim()) return setStep1Error("Please enter a title.");
    if (totalAmountNum < 1)
      return setStep1Error("Total amount must be at least R1.00.");
    if (!payoutAccountId && payoutAccounts.length > 0)
      return setStep1Error("Please select a payout account.");
    setStep1Error("");
    setStep(2);
  }

  // ── Step 2 payer actions ─────────────────────────────────────────────────────
  async function pickContact() {
    try {
      const contacts = await (navigator as any).contacts.select(["name", "tel"], {
        multiple: false,
      });
      if (contacts.length > 0) {
        const c = contacts[0];
        setPayerName(c.name?.[0] ?? "");
        setPayerPhone((c.tel?.[0] ?? "").replace(/[\s\-()]/g, ""));
      }
    } catch {
      // User cancelled or API unavailable — ignore silently
    }
  }

  function addPayer() {
    if (!payerName.trim()) return setPayerError("Name is required.");
    if (!PHONE_RE.test(payerPhone))
      return setPayerError(
        "Enter a valid 10-digit SA mobile number starting with 06, 07, or 08."
      );
    if (amountMode === "custom") {
      const amt = parseFloat(payerAmount);
      if (!payerAmount || amt <= 0)
        return setPayerError("Enter a valid amount.");
    }
    setPayers((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        name: payerName.trim(),
        phone: payerPhone.trim(),
        amountOwed: amountMode === "custom" ? parseFloat(payerAmount) : 0,
      },
    ]);
    setPayerName("");
    setPayerPhone("");
    setPayerAmount("");
    setPayerError("");
  }

  // ── Send all via WhatsApp ────────────────────────────────────────────────────
  async function sendAll(createdPayers: CreatedPayer[]) {
    for (let i = 0; i < createdPayers.length; i++) {
      window.open(
        buildWaLink(createdPayers[i], hostFirstName, title, amountMode),
        "_blank"
      );
      if (i < createdPayers.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  // ── WhatsApp preview (Step 3) ────────────────────────────────────────────────
  const firstPayer = payers[0];
  const previewAmount =
    amountMode === "equal_split"
      ? perPerson
      : amountMode === "custom"
      ? firstPayer?.amountOwed ?? 0
      : 0;

  const previewBody = firstPayer
    ? amountMode === "open"
      ? `Hi ${firstPayer.name} 👋 ${hostFirstName} has set up a payment for ${title}. You decide the amount.\n\nTap your secure payment link to pay:\n[link will be generated on submit]\n\nPowered by Grüp 🌿`
      : `Hi ${firstPayer.name} 👋 ${hostFirstName} has requested a payment of R${fmt(previewAmount)} for ${title}.\n\nTap your secure payment link to pay:\n[link will be generated on submit]\n\nPowered by Grüp 🌿`
    : "";

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: "#F5E6C8" }} className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Step indicator — hidden on Step 4 success/error */}
        {(step < 4 || step4State?.status === "saving") && (
          <div className="mb-8">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#0D4A2A" }}
            >
              Step {step} of 4
            </span>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: n <= step ? "#0D4A2A" : "#C8B99A" }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold" style={{ color: "#0D4A2A" }}>
              New payment event
            </h1>

            {isRepeat && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ backgroundColor: "#F5E0C0", color: "#7B3F00" }}
              >
                Repeating: <span className="font-semibold">{repeatParams?.title}</span> — edit any details below
              </div>
            )}

            {/* Title */}
            <div>
              <label
                htmlFor="ev-title"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0D4A2A" }}
              >
                What is this payment for?
              </label>
              <input
                id="ev-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dinner at Col'Cacchio, Tennis coaching June, Weekend trip to Hermanus"
                className={inputCls}
              />
            </div>

            {/* Total amount */}
            <div>
              <label
                htmlFor="ev-amount"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0D4A2A" }}
              >
                Total amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  R
                </span>
                <input
                  id="ev-amount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className={`${inputCls} pl-7`}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="ev-desc"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0D4A2A" }}
              >
                Add a note (optional)
              </label>
              <textarea
                id="ev-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Shown to payers on the payment page"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Amount mode */}
            <div>
              <p
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0D4A2A" }}
              >
                How do you want to split this?
              </p>
              <div className="space-y-2">
                {(
                  [
                    {
                      value: "equal_split",
                      label: "Equal split",
                      desc: "Divide equally among all payers",
                    },
                    {
                      value: "custom",
                      label: "Custom",
                      desc: "Set a specific amount per person",
                    },
                    {
                      value: "open",
                      label: "Open",
                      desc: "Payer decides the amount",
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      amountMode === opt.value
                        ? "border-green-900 bg-white"
                        : "border-transparent bg-white/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="amountMode"
                      value={opt.value}
                      checked={amountMode === opt.value}
                      onChange={() => setAmountMode(opt.value)}
                      className="mt-0.5 accent-green-900"
                    />
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#0D4A2A" }}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Payout account */}
            <div>
              <label
                htmlFor="ev-account"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0D4A2A" }}
              >
                Pay into
              </label>
              {payoutAccounts.length === 0 ? (
                <div
                  className="rounded-xl border-2 bg-white/60 p-4"
                  style={{ borderColor: "#D97706" }}
                >
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    No payment account linked
                  </p>
                  <Link
                    href="/dashboard/accounts/new"
                    className="text-sm font-medium underline underline-offset-2"
                    style={{ color: "#0D4A2A" }}
                  >
                    Link a payment account →
                  </Link>
                </div>
              ) : (
                <select
                  id="ev-account"
                  value={payoutAccountId}
                  onChange={(e) => setPayoutAccountId(e.target.value)}
                  className={inputCls}
                >
                  {payoutAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.display_name} — {a.bank_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {step1Error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">
                {step1Error}
              </p>
            )}

            <button
              onClick={handleStep1Next}
              disabled={payoutAccounts.length === 0}
              className={`w-full ${primaryBtn}`}
              style={{ backgroundColor: "#0D4A2A" }}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold" style={{ color: "#0D4A2A" }}>
              Add payers
            </h1>

            {/* Live summary bar */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/70 p-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total</p>
                <p className="text-sm font-bold" style={{ color: "#0D4A2A" }}>
                  R{fmt(totalAmountNum)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Per person</p>
                <p className="text-sm font-bold" style={{ color: "#0D4A2A" }}>
                  {amountMode === "equal_split"
                    ? payers.length > 0
                      ? `R${fmt(perPerson)}`
                      : "—"
                    : amountMode === "open"
                    ? "Open"
                    : "Custom"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Payers</p>
                <p className="text-sm font-bold" style={{ color: "#0D4A2A" }}>
                  {payers.length}
                </p>
              </div>
            </div>

            {/* Add payer form */}
            <div className="rounded-2xl bg-white/70 p-4 space-y-3">
              <p className="text-sm font-semibold" style={{ color: "#0D4A2A" }}>
                Add a payer
              </p>

              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPayer()}
                placeholder="e.g. Sarah"
                className={inputCls}
              />

              <input
                type="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPayer()}
                placeholder="0821234567"
                maxLength={10}
                className={inputCls}
              />

              {amountMode === "custom" && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    R
                  </span>
                  <input
                    type="number"
                    value={payerAmount}
                    onChange={(e) => setPayerAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className={`${inputCls} pl-7`}
                  />
                </div>
              )}

              {amountMode === "equal_split" && (
                <p className="text-xs text-gray-500">
                  This payer will owe R
                  {fmt(totalAmountNum / (payers.length + 1))} (split among{" "}
                  {payers.length + 1} payer
                  {payers.length + 1 !== 1 ? "s" : ""})
                </p>
              )}

              {payerError && (
                <p className="text-xs text-red-600">{payerError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={addPayer}
                  className={`flex-1 ${primaryBtn}`}
                  style={{ backgroundColor: "#0D4A2A" }}
                >
                  Add payer
                </button>
                {contactsSupported && (
                  <button
                    onClick={pickContact}
                    className={`px-4 text-sm font-medium border-2 rounded-xl hover:bg-white/60 transition-colors`}
                    style={{ borderColor: "#0D4A2A", color: "#0D4A2A" }}
                    title="Choose from contacts"
                  >
                    👤
                  </button>
                )}
              </div>
            </div>

            {/* Payer list */}
            {payers.length > 0 && (
              <div className="space-y-2">
                {payers.map((p) => (
                  <div
                    key={p.localId}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                  >
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#0D4A2A" }}
                      >
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500">{p.phone}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#0D4A2A" }}
                      >
                        {amountMode === "equal_split"
                          ? `R${fmt(perPerson)}`
                          : amountMode === "custom"
                          ? `R${fmt(p.amountOwed)}`
                          : "Open"}
                      </span>
                      <button
                        onClick={() =>
                          setPayers((prev) =>
                            prev.filter((x) => x.localId !== p.localId)
                          )
                        }
                        className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none"
                        aria-label="Remove payer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className={`flex-1 ${outlineBtn}`}
                style={{ borderColor: "#0D4A2A", color: "#0D4A2A" }}
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  if (payers.length === 0)
                    return setPayerError(
                      "Add at least one payer before continuing."
                    );
                  setPayerError("");
                  setStep(3);
                }}
                className={`flex-1 ${primaryBtn}`}
                style={{ backgroundColor: "#0D4A2A" }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold" style={{ color: "#0D4A2A" }}>
              Review
            </h1>

            {/* Event summary card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Event
                </p>
                <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                  {title}
                </p>
                {description && (
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                )}
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                    Total
                  </p>
                  <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                    R{fmt(totalAmountNum)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                    Split
                  </p>
                  <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                    {amountMode === "equal_split"
                      ? "Equal split"
                      : amountMode === "custom"
                      ? "Custom"
                      : "Open"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
                  Payout account
                </p>
                <p className="font-semibold" style={{ color: "#0D4A2A" }}>
                  {selectedAccount?.display_name} — {selectedAccount?.bank_name}
                </p>
              </div>
            </div>

            {/* Payers */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#0D4A2A" }}
              >
                Payers ({payers.length})
              </p>
              <div className="space-y-2">
                {payers.map((p) => (
                  <div
                    key={p.localId}
                    className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                  >
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "#0D4A2A" }}
                      >
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-500">{p.phone}</p>
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#0D4A2A" }}
                    >
                      {amountMode === "equal_split"
                        ? `R${fmt(perPerson)}`
                        : amountMode === "custom"
                        ? `R${fmt(p.amountOwed)}`
                        : "Open"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp message preview */}
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#0D4A2A" }}
              >
                Message preview
              </p>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                {firstPayer ? (
                  <div
                    className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono"
                    style={{ backgroundColor: "#DCF8C6", color: "#2C2C2C" }}
                  >
                    {previewBody}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Add at least one payer to see the preview.
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Each payer receives a personalised message with their unique
                  link
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className={`flex-1 ${outlineBtn}`}
                style={{ borderColor: "#0D4A2A", color: "#0D4A2A" }}
              >
                ← Back
              </button>
              <button
                onClick={handleConfirmAndCreate}
                className={`flex-1 ${primaryBtn}`}
                style={{ backgroundColor: "#0D4A2A" }}
              >
                Confirm and create
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div>
            {/* Saving */}
            {(!step4State || step4State.status === "saving") && (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-green-200 border-t-green-900 animate-spin" />
                <p className="text-sm text-gray-500">
                  Creating your payment event…
                </p>
              </div>
            )}

            {/* Error */}
            {step4State?.status === "error" && (
              <div className="flex flex-col items-center gap-5 py-20 text-center">
                <p className="text-5xl">⚠️</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: "#0D4A2A" }}
                >
                  Something went wrong
                </p>
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200 max-w-sm">
                  {step4State.message}
                </p>
                <button
                  onClick={handleRetry}
                  className={`px-8 ${primaryBtn}`}
                  style={{ backgroundColor: "#0D4A2A" }}
                >
                  Try again
                </button>
              </div>
            )}

            {/* Success */}
            {step4State?.status === "success" && (
              <div className="space-y-5">
                <div className="text-center pt-4 pb-2">
                  <p className="text-5xl mb-3">🎉</p>
                  <h1
                    className="text-2xl font-bold"
                    style={{ color: "#0D4A2A" }}
                  >
                    Payment event created!
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {step4State.event.title}
                  </p>
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: "#0D4A2A" }}
                  >
                    R{fmt(step4State.event.totalAmount)}
                  </p>
                </div>

                {/* Send all */}
                <button
                  onClick={() => sendAll(step4State.payers)}
                  className={`w-full ${primaryBtn} flex items-center justify-center gap-2`}
                  style={{ backgroundColor: "#25D366" }}
                >
                  💬 Send all via WhatsApp
                </button>

                {/* Per-payer send buttons */}
                <div className="space-y-2">
                  {step4State.payers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#0D4A2A" }}
                        >
                          {p.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.phone_number}
                        </p>
                      </div>
                      <a
                        href={buildWaLink(
                          p,
                          hostFirstName,
                          title,
                          amountMode
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "#25D366" }}
                      >
                        💬 Send
                      </a>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push("/dashboard")}
                  className={`w-full ${outlineBtn}`}
                  style={{ borderColor: "#0D4A2A", color: "#0D4A2A" }}
                >
                  Go to dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

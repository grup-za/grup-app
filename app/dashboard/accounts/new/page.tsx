"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPayoutAccount } from "./actions";

const SA_BANKS = [
  "ABSA",
  "Capitec",
  "FNB",
  "Nedbank",
  "Standard Bank",
  "Investec",
  "African Bank",
  "TymeBank",
  "Discovery Bank",
  "Bidvest Bank",
];

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900";

export default function NewAccountPage() {
  const [state, action, pending] = useActionState(createPayoutAccount, null);

  return (
    <div style={{ backgroundColor: "#F5E6C8" }} className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium"
            style={{ color: "#0D4A2A" }}
          >
            ← Back
          </Link>
          <h1
            className="text-2xl font-bold mt-3"
            style={{ color: "#0D4A2A" }}
          >
            Link a payment account
          </h1>
        </div>

        <form action={action} className="space-y-5">

          {/* Account nickname */}
          <div>
            <label
              htmlFor="display_name"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0D4A2A" }}
            >
              Account nickname
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              placeholder="e.g. FNB Cheque Account"
              required
              className={inputClass}
            />
          </div>

          {/* Bank name */}
          <div>
            <label
              htmlFor="bank_name"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0D4A2A" }}
            >
              Bank name
            </label>
            <select
              id="bank_name"
              name="bank_name"
              required
              className={inputClass}
            >
              <option value="">Select a bank</option>
              {SA_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {/* Account number */}
          <div>
            <label
              htmlFor="account_number"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0D4A2A" }}
            >
              Account number
            </label>
            <input
              id="account_number"
              name="account_number"
              type="text"
              required
              className={inputClass}
            />
          </div>

          {/* Account type */}
          <div>
            <label
              htmlFor="account_type"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0D4A2A" }}
            >
              Account type
            </label>
            <select
              id="account_type"
              name="account_type"
              required
              className={inputClass}
            >
              <option value="">Select account type</option>
              <option value="cheque">Cheque</option>
              <option value="savings">Savings</option>
              <option value="transmission">Transmission</option>
            </select>
          </div>

          {/* Branch code */}
          <div>
            <label
              htmlFor="branch_code"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0D4A2A" }}
            >
              Branch code
            </label>
            <input
              id="branch_code"
              name="branch_code"
              type="text"
              required
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
              Universal branch codes: FNB 250655 · ABSA 632005 · Nedbank 198765
              · Standard Bank 051001 · Capitec 470010
            </p>
          </div>

          {/* Set as default */}
          <div className="flex items-center gap-2.5">
            <input
              id="is_default"
              name="is_default"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded accent-green-900"
            />
            <label
              htmlFor="is_default"
              className="text-sm"
              style={{ color: "#0D4A2A" }}
            >
              Set as default account
            </label>
          </div>

          {/* Inline error */}
          {state?.error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
              {state.error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl px-4 py-3 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#0D4A2A" }}
          >
            {pending ? "Saving…" : "Save account"}
          </button>

        </form>
      </div>
    </div>
  );
}

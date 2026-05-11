"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PayerInput = {
  name: string;
  phone: string;
  amountOwed: number;
};

type CreateEventInput = {
  title: string;
  description: string;
  totalAmount: number;
  amountMode: "equal_split" | "custom" | "open";
  payoutAccountId: string;
  payers: PayerInput[];
};

export async function createPaymentEvent(input: CreateEventInput) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await createClient();

  // 1. Insert the event
  const { data: event, error: eventError } = await supabase
    .from("payment_events")
    .insert({
      clerk_user_id: userId,
      title: input.title,
      description: input.description || null,
      total_amount: input.totalAmount,
      amount_mode: input.amountMode,
      payout_account_id: input.payoutAccountId || null,
      status: "active",
    })
    .select("id")
    .single();

  if (eventError || !event) {
    return { error: eventError?.message ?? "Failed to create payment event." };
  }

  // 2. Insert all payers
  const { error: payersError } = await supabase
    .from("payment_event_payers")
    .insert(
      input.payers.map((p) => ({
        payment_event_id: event.id,
        name: p.name,
        phone_number: p.phone,
        amount_owed: p.amountOwed,
      }))
    );

  if (payersError) {
    return { error: payersError.message };
  }

  // 3. Fetch created payers to get their generated payment_tokens
  const { data: createdPayers, error: fetchError } = await supabase
    .from("payment_event_payers")
    .select("id, name, phone_number, amount_owed, payment_token")
    .eq("payment_event_id", event.id)
    .order("created_at", { ascending: true });

  if (fetchError) {
    return { error: fetchError.message };
  }

  return {
    success: true as const,
    event: {
      id: event.id,
      title: input.title,
      totalAmount: input.totalAmount,
    },
    payers: createdPayers,
  };
}

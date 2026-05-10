"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPayoutAccount(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await createClient();

  const { error } = await supabase.from("payout_accounts").insert({
    clerk_user_id: userId,
    display_name: formData.get("display_name") as string,
    bank_name: formData.get("bank_name") as string,
    account_number: formData.get("account_number") as string,
    branch_code: formData.get("branch_code") as string,
    account_type: formData.get("account_type") as string,
    is_default: formData.get("is_default") === "on",
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

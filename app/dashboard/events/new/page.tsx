import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventForm } from "./EventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; amount?: string; mode?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const [params, supabase] = await Promise.all([
    searchParams,
    createClient(),
  ]);

  const { data: payoutAccounts } = await supabase
    .from("payout_accounts")
    .select("id, display_name, bank_name")
    .eq("clerk_user_id", user.id)
    .order("is_default", { ascending: false });

  return (
    <EventForm
      hostFirstName={user.firstName ?? "Host"}
      payoutAccounts={payoutAccounts ?? []}
      repeatParams={params}
    />
  );
}

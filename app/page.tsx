import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-6xl font-bold text-brand-primary">Grüp</h1>
      <p className="text-xl text-brand-text">
        Group &amp; service payments for South Africa
      </p>
      <Link href="/sign-in">
        <button className="rounded-lg bg-brand-primary px-6 py-3 text-white hover:opacity-90 transition-opacity">
          Create payment event
        </button>
      </Link>
    </main>
  );
}

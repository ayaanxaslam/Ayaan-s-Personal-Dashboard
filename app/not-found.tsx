import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-ink">404</p>
        <p className="mt-2 text-sm text-ink-3">This page doesn&apos;t exist.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-2xl bg-ink px-4 py-2.5 text-sm font-semibold text-surface">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

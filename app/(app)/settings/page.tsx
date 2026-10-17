import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { getUserContext } from "@/lib/data";
import { signOut } from "@/app/actions/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { settings, profile, user, supabase } = await getUserContext();
  const { count } = await supabase.from("habits").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Goals, units and preferences — saved to your account and synced across devices." />
      <SettingsForm settings={settings} profile={profile} />

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader title="Habits" subtitle={`${count ?? 0} habit${count === 1 ? "" : "s"} · names, icons and schedules`} />
          <Link
            href="/habits"
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-surface-2 px-4 text-sm font-semibold text-ink transition hover:bg-surface-3"
          >
            Manage habits <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </Card>
        <Card>
          <CardHeader title="Account" subtitle={user.email ?? "Signed in"} />
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

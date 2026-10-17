import { getUserContext } from "@/lib/data";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { UserSync } from "@/components/nav/user-sync";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, settings } = await getUserContext();
  return (
    <ToastProvider>
      <UserSync timezone={settings.timezone} theme={settings.theme} />
      <div className="mx-auto flex min-h-dvh max-w-[1440px]">
        <Sidebar email={user.email} />
        <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </ToastProvider>
  );
}

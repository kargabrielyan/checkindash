import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, UserCircle, LogOut } from "lucide-react";
import { logout } from "@/app/auth-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const nav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/employees", label: "Employees", icon: UserCircle },
    { href: "/dashboard/users", label: "Users", icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold">
              Office Presence
            </Link>
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{session.email}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="icon" title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}

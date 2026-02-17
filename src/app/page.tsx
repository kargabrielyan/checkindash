import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold tracking-tight">Office Presence</h1>
        <p className="text-muted-foreground max-w-md">
          Admin dashboard for tracking office presence and working time.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}

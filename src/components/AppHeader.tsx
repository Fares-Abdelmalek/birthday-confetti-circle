import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

export function AppHeader({ user }: { user: User | null }) {
  return (
    <header className="flex items-center justify-between px-4 pt-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground">
          B
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Birthday Circle</span>
      </Link>
      {user ? (
        <Link
          to="/settings"
          className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium ring-1 ring-border"
        >
          My profile
        </Link>
      ) : (
        <Link
          to="/auth"
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      )}
    </header>
  );
}

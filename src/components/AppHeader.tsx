import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { useCart } from "@/lib/cart";

export function AppHeader({ user, alerts = 0 }: { user: User | null; alerts?: number }) {
  const { count } = useCart();

  return (
    <header className="flex items-center justify-between px-4 pt-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground">
          B
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Birthday Circle</span>
      </Link>
      {user ? (
        <div className="flex items-center gap-2">
          <Link
            to="/store"
            search={{}}
            className="rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium ring-1 ring-border"
          >
            Store
          </Link>
          <Link
            to="/checkout"
            className="relative rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium ring-1 ring-border"
          >
            Cart
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <Link
            to="/settings"
            className="relative rounded-full bg-secondary/70 px-3 py-1.5 text-xs font-medium ring-1 ring-border"
          >
            Me
            {alerts > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {alerts}
              </span>
            )}
          </Link>
        </div>
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

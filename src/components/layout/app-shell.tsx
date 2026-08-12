import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import myioLogo from "@/Img/myio.png";

export function Brand({ subtitle = "Market Intelligence" }: { subtitle?: string }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 px-1">
      <img src={myioLogo} alt="" className="h-9 w-auto shrink-0 object-contain" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight">Cryptolytic</span>
        <span className="block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}

/**
 * The signed-in account menu (avatar → identity + sign out). The console is a
 * single full-screen chat now, so the menu keeps account management minimal —
 * everything else happens inside the conversation.
 */
export function AccountMenu() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const clearSession = useAuth((s) => s.clearSession);

  const displayName = profile?.displayName?.trim() || user?.name?.trim() || "Analyst";
  const email = user?.email ?? "";
  const avatarUrl = profile?.avatarUrl ?? "";
  const initials =
    ((displayName || user?.email || "??").match(/\b\w/g) ?? [])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border p-1 pr-2 transition-colors hover:border-primary/40">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-7 rounded-md object-cover ring-1 ring-primary/30"
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
            {initials}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-xs font-medium sm:block">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="size-10 rounded-lg object-cover ring-1 ring-primary/30"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {email || "Signed in via OAuth"}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            clearSession();
            void navigate({ to: "/login", replace: true });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

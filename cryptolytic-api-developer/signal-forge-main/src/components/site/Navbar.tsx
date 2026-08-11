import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import logoImage from "@/Img/image.png";

const NAV = [
  { label: "Indicators", to: "/indicators" },
  { label: "Developers", to: "/docs" },
  { label: "Pricing", to: "/pricing" },
  { label: "Documentation", to: "/docs" },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <img
        src={logoImage}
        alt=""
        aria-hidden
        className="h-7 w-7 shrink-0 rounded-md border border-border-strong object-contain"
      />
      {!compact && (
        <span className="truncate text-sm font-semibold tracking-tight">
          Cryptolytic<span className="text-subtle"> API</span>
        </span>
      )}
    </span>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <Link to="/" className="min-w-0">
          <Logo />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-md bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Get API Key
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-border bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 pb-6 pt-2">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid gap-2">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-4 py-2.5 text-center text-sm text-foreground"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Get API Key
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A technical indicator calculation API for dashboards, bots, AI agents and analytics
            platforms.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Indicators", to: "/indicators" },
            { label: "Playground", to: "/playground" },
            { label: "Pricing", to: "/pricing" },
          ]}
        />
        <FooterCol
          title="Developers"
          links={[
            { label: "Documentation", to: "/docs" },
            { label: "API Keys", to: "/api-keys" },
            { label: "Usage", to: "/usage" },
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            { label: "Login", to: "/login" },
            { label: "Register", to: "/register" },
            { label: "Settings", to: "/settings" },
          ]}
        />
      </div>
      <div className="border-t border-border px-5 py-6 sm:px-8">
        <p className="mx-auto max-w-7xl font-mono text-[11px] uppercase tracking-widest text-subtle">
          Cryptolytic API — Indicator infrastructure
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <p className="mono-label">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LoopingVideo } from "@/components/layout/looping-video";
import loreVideo from "@/video/lore.mp4";
import myioLogo from "@/Img/myio.png";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — the auth form */}
      <div className="relative flex items-center justify-center overflow-hidden px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="relative w-full max-w-md">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
            <img
              src={myioLogo}
              alt=""
              className="h-9 w-auto rounded-lg object-contain ring-1 ring-primary/30"
            />
            <span className="text-sm font-semibold tracking-tight">Cryptolytic</span>
          </Link>
          <div className="panel p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6 space-y-4">{children}</div>
          </div>
          <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>
        </div>
      </div>

      {/* Right — looping background video (hidden on small screens) */}
      <div aria-hidden className="relative hidden overflow-hidden lg:block">
        <LoopingVideo src={loreVideo} />
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import {
  FlameIcon,
  HeartIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

export type TabId = "decouvrir" | "deux" | "envies" | "profil";

const TABS: {
  id: TabId;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  small?: boolean;
}[] = [
  { id: "decouvrir", label: "Découvrir", icon: FlameIcon },
  { id: "deux", label: "Notre Espace", icon: UsersIcon },
  { id: "envies", label: "Mes Envies", icon: HeartIcon },
  { id: "profil", label: "Nous & Réglages", icon: UserIcon, small: true },
];

/**
 * Coque mobile-first : en-tête compact, zone de contenu et barre d'onglets
 * fixe. La hauteur est verrouillée sur `100dvh` : seuls les onglets qui en ont
 * besoin défilent, jamais la page entière.
 */
export function AppShell({
  tab,
  onTabChange,
  unread,
  action,
  status,
  children,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  unread: number;
  action?: ReactNode;
  status?: { label: string; complete: boolean; onClick?: () => void };
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-ink-950">
      <header className="shrink-0 border-b border-gold/10 bg-ink-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 flex-col justify-center">
            <Brand />
            {status ? (
              <button
                type="button"
                onClick={status.onClick}
                className="mt-0.5 inline-flex items-center gap-1.5 self-start text-[8.5px] font-medium text-ash transition hover:text-cream/75"
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    status.complete ? "bg-mint" : "bg-gold"
                  }`}
                />
                {status.label}
              </button>
            ) : null}
          </div>
          {action}
        </div>
      </header>

      <main className="relative min-h-0 flex-1">{children}</main>

      <nav
        aria-label="Navigation principale"
        className="shrink-0 border-t border-gold/15 bg-ink-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <ul className="mx-auto flex h-16 w-full max-w-3xl items-stretch">
          {TABS.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                    active ? "text-gold" : "text-ash hover:text-cream/80"
                  }`}
                >
                  <span
                    className={`relative grid h-7 min-w-9 place-items-center rounded-full px-2 transition ${
                      active
                        ? "bg-gold/10 ring-1 ring-inset ring-gold/25"
                        : "group-hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="h-[19px] w-[19px]" />
                    {item.id === "deux" && unread > 0 ? (
                      <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold leading-none text-cream ring-1 ring-gold/40">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`whitespace-nowrap leading-none ${
                      item.small ? "text-[8.5px]" : "text-[9.5px]"
                    } ${active ? "font-semibold" : "font-medium"}`}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

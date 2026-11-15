"use client";

import { PreferenceForm } from "@/components/preference-form";
import { Brand } from "@/components/brand";
import { AccountCard } from "@/components/account-card";
import { InstallCard } from "@/components/install-card";
import { ThemePicker } from "@/components/theme-picker";
import { WidgetStatusCard } from "@/components/widget-status-card";
import { PushStatusCard } from "@/components/push-status-card";
import {
  ArrowRightIcon,
  BoltIcon,
  LockIcon,
  SparklesIcon,
} from "@/components/icons";
import type { AuthProvider } from "@/lib/auth/provider";
import type { AccountSnapshot, CoupleSnapshot, Prefs } from "@/lib/types";

type ResumeInfo = { remaining: number; liked: number };

type Props = {
  initialPrefs: Prefs;
  resume: ResumeInfo | null;
  isEditing: boolean;
  starting: boolean;
  error: string | null;
  couple: CoupleSnapshot | null;
  duoBusy: boolean;
  duoError: string | null;
  account: AccountSnapshot | null;
  authProviders: AuthProvider[];
  hasSession: boolean;
  onStart: (prefs: Prefs) => Promise<void>;
  onResume: () => void;
  onCancelEdit: () => void;
  onCreateDuo: (prefs: Prefs) => Promise<void>;
  onJoinDuo: (prefs: Prefs, code: string) => Promise<void>;
  onManageDuo: () => void;
  onCopyDuoCode: () => void;
};

const FEATURES = [
  {
    title: "Des filtres utiles",
    body: "Budget, intérieur ou extérieur, moment de la journée, ambiance et thèmes.",
    emoji: "🎛️",
  },
  {
    title: "Un swipe qui répond",
    body: "Glissez, utilisez les boutons ou les flèches du clavier. Annulez d’un geste.",
    emoji: "💫",
  },
  {
    title: "Vos envies, gardées",
    body: "Retrouvez votre liste de rendez-vous et copiez-la pour la partager.",
    emoji: "💌",
  },
];

export function SetupScreen({
  initialPrefs,
  resume,
  isEditing,
  starting,
  error,
  couple,
  duoBusy,
  duoError,
  account,
  authProviders,
  hasSession,
  onStart,
  onResume,
  onCancelEdit,
  onCreateDuo,
  onJoinDuo,
  onManageDuo,
  onCopyDuoCode,
}: Props) {
  return (
    <main className="mx-auto flex min-h-screen min-h-dvh w-full max-w-7xl flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center justify-between pb-5 pt-[max(2.25rem,env(safe-area-inset-top))] sm:pt-5">
        <Brand />
        <span className="hidden items-center gap-1.5 rounded-full border border-gold/20 bg-ink-800/50 px-3 py-1.5 text-[10.5px] text-cream/55 sm:inline-flex">
          <LockIcon className="h-3.5 w-3.5 text-gold/80" />
          {account
            ? `Connecté · ${account.displayName ?? account.email ?? "compte"}`
            : "Sans compte · session anonyme"}
        </span>
      </header>

      <div className="grid flex-1 items-center gap-8 pb-6 pt-2 xl:grid-cols-[1.18fr_0.82fr] xl:gap-14">
        <section className="mx-auto w-full max-w-2xl xl:mx-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/85 sm:text-[11px] sm:tracking-[0.26em]">
            <SparklesIcon className="h-3.5 w-3.5" />
            Le rendez-vous, sans l’indécision
          </p>

          <h1 className="balance mt-4 font-display text-[36px] leading-[0.98] tracking-[-0.02em] text-cream sm:text-[44px] xl:text-[50px]">
            Moins de «&nbsp;on fait quoi&nbsp;?&nbsp;»,
            <br className="hidden sm:block" /> plus de souvenirs.
          </h1>

          <p className="mt-4 max-w-md text-[14px] leading-relaxed text-cream/60">
            Choisissez votre budget, l’ambiance et le lieu. On vous propose des
            idées de rendez-vous à swiper : gardez celles qui vous ressemblent,
            laissez filer les autres. En duo, vous découvrez aussi celles que
            vous aimez en commun.
          </p>

          <ul className="mt-7 hidden gap-3 text-[12.5px] sm:grid sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="grimoire rounded-2xl p-3.5"
              >
                <span aria-hidden className="text-lg">
                  {feature.emoji}
                </span>
                <p className="mt-1.5 font-medium text-cream/90">{feature.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ash">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>

          <CardPreview />

          <div className="mt-6 hidden flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-ash sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <BoltIcon className="h-3.5 w-3.5 text-gold/80" />
              30 secondes pour commencer
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockIcon className="h-3.5 w-3.5 text-mint/80" />
              Aucune donnée personnelle demandée
            </span>
          </div>
        </section>

        <div
          id="selection"
          className="mx-auto w-full max-w-2xl xl:mx-0 xl:max-w-none xl:justify-self-end"
        >
          <PreferenceForm
            initialPrefs={initialPrefs}
            resume={resume}
            isEditing={isEditing}
            starting={starting}
            error={error}
            couple={couple}
            duoBusy={duoBusy}
            duoError={duoError}
            onStart={onStart}
            onResume={onResume}
            onCancelEdit={onCancelEdit}
            onCreateDuo={onCreateDuo}
            onJoinDuo={onJoinDuo}
            onManageDuo={onManageDuo}
            onCopyDuoCode={onCopyDuoCode}
          />

          <p className="mt-3 px-2 text-center text-[10.5px] leading-relaxed text-ash">
            Vos préférences sont liées à un cookie de session anonyme, valable 30
            jours. Aucune inscription, aucune revente de données.
          </p>

          <div className="mt-4 space-y-3">
            <AccountCard account={account} providers={authProviders} />
            <InstallCard />
            <ThemePicker />
            <WidgetStatusCard
              hasSession={hasSession}
              coupleComplete={couple?.complete === true}
            />
            <PushStatusCard hasSession={hasSession} />
          </div>
        </div>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-gold/15 pt-4 text-[10.5px] text-ash sm:flex-row">
        <p>À deux — des centaines d’idées et un espace à deux pour arrêter de scroller.</p>
        <span className="inline-flex items-center gap-4">
          <a
            href="/telecharger"
            className="transition hover:text-cream/60"
          >
            Application Android
          </a>
          <a
            href="#selection"
            className="inline-flex items-center gap-1 transition hover:text-cream/60"
          >
            Configurer ma sélection
            <ArrowRightIcon className="h-3 w-3" />
          </a>
        </span>
      </footer>
    </main>
  );
}

function CardPreview() {
  return (
    <div
      aria-hidden
      className="relative mt-8 hidden h-40 w-full max-w-[360px] sm:block"
    >
      <div
        className="absolute left-2 top-3 h-32 w-56 rotate-[-9deg] rounded-2xl border border-gold/20 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(145deg, #4a121c 0%, #140f13 100%)",
        }}
      />
      <div
        className="absolute left-16 top-1 h-32 w-56 rotate-[6deg] rounded-2xl border border-gold/20 opacity-70"
        style={{
          backgroundImage: "linear-gradient(145deg, #6d4a1f 0%, #1a161c 100%)",
        }}
      />
      <div className="animate-drift frame-gold absolute left-8 top-2 flex h-36 w-64 rotate-[-2deg] flex-col justify-between rounded-2xl border border-gold/30 bg-ink-850/95 p-3.5 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-ink-950/60 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-cream/85 ring-1 ring-gold/30">
            Nature
          </span>
          <span className="text-[9px] text-cream/55">≈ 15 €</span>
        </div>
        <div>
          <span className="text-3xl">🧺</span>
          <p className="mt-1 font-display text-base leading-tight text-cream">
            Pique-nique au coucher du soleil
          </p>
          <p className="text-[9px] text-ash">2 h · Extérieur · Soirée</p>
        </div>
      </div>
      <div className="absolute -bottom-2 right-2 rounded-full border border-gold/40 bg-ink-950/70 px-3 py-1 text-[10px] font-medium text-gold">
        → à garder
      </div>
    </div>
  );
}

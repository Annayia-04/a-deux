"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { ChoiceDeck } from "@/components/choice-deck";
import {
  AlertIcon,
  ArrowRightIcon,
  BellIcon,
  BookIcon,
  CardsIcon,
  CheckIcon,
  CopyIcon,
  HeartIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import {
  SouvenirDialog,
  type SouvenirPrefill,
} from "@/components/souvenir-dialog";
import { SouvenirTimeline } from "@/components/souvenir-timeline";
import { THEME_META } from "@/lib/preferences";
import { useChoices } from "@/lib/use-choices";
import { useSouvenirs } from "@/lib/use-souvenirs";
import type {
  Choice,
  CoupleSnapshot,
  MatchSnapshot,
  SouvenirSnapshot,
} from "@/lib/types";

export type DuoDialogTab = "matches" | "souvenirs" | "choices";

type Props = {
  open: boolean;
  couple: CoupleSnapshot | null;
  busy: boolean;
  error: string | null;
  initialTab?: DuoDialogTab;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
  onJoin: (code: string) => void | Promise<void>;
  onLeave: () => void | Promise<void>;
  onCopyCode: () => void;
  onMarkSeen: () => void | Promise<void>;
  onChoiceMatch: (choice: Choice) => void;
  onTabChange?: (tab: DuoDialogTab) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
};

type SouvenirState =
  | { mode: "create"; prefill: SouvenirPrefill | null }
  | { mode: "note"; souvenir: SouvenirSnapshot }
  | null;

function formatMatchDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function DuoDialog({
  open,
  couple,
  busy,
  error,
  initialTab = "matches",
  onClose,
  onCreate,
  onJoin,
  onLeave,
  onCopyCode,
  onMarkSeen,
  onChoiceMatch,
  onTabChange,
  soundEnabled = true,
  onToggleSound,
}: Props) {
  const [code, setCode] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [tab, setTab] = useState<DuoDialogTab>(initialTab);
  const [souvenirState, setSouvenirState] = useState<SouvenirState>(null);
  const [souvenirBusy, setSouvenirBusy] = useState(false);
  const [souvenirError, setSouvenirError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const dragMovedRef = useRef(false);

  const complete = couple?.complete === true;
  const isOpen = open && couple !== null;

  const souvenirs = useSouvenirs({
    enabled: isOpen && complete,
    coupleCode: couple?.code ?? null,
  });

  const choices = useChoices({
    enabled: isOpen && complete && tab === "choices",
    coupleCode: couple?.code ?? null,
    onMatch: onChoiceMatch,
  });

  const { refresh: refreshChoices, markSeen: markChoicesSeen } = choices;

  useEffect(() => {
    if (!open) {
      setCode("");
      setConfirmLeave(false);
      setSouvenirState(null);
      setSouvenirError(null);
      setExpanded(false);
    } else {
      setTab(initialTab);
      onTabChange?.(initialTab);
      if (initialTab === "choices") setExpanded(true);
    }
  }, [open, initialTab, onTabChange]);

  const selectTab = useCallback(
    (next: DuoDialogTab) => {
      setTab(next);
      onTabChange?.(next);
      if (next === "choices") setExpanded(true);
    },
    [onTabChange],
  );

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (!isMobile) return;
      if (info.offset.y < -44 || info.velocity.y < -420) {
        setExpanded(true);
        return;
      }
      if (info.offset.y > 56 || info.velocity.y > 500) {
        if (expanded) setExpanded(false);
        else onClose();
      }
    },
    [expanded, isMobile, onClose],
  );

  const sheetDragProps = isMobile
    ? {
        drag: "y" as const,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: 0.14,
        dragMomentum: false,
        onDragStart: () => {
          dragMovedRef.current = false;
        },
        onDrag: (_event: unknown, info: PanInfo) => {
          if (Math.abs(info.offset.y) > 6) dragMovedRef.current = true;
        },
        onDragEnd: handleDragEnd,
      }
    : {};

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Le dialogue de souvenir est au-dessus : il gère sa propre fermeture.
      if (event.key === "Escape" && !souvenirState) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, souvenirState]);

  // Un match de choix découvert pendant la consultation apparaît sans recharger.
  useEffect(() => {
    if (!open || tab !== "choices" || !couple?.code) return;
    // `refreshChoices` est volontairement hors dépendances : le hook recharge
    // déjà au changement de catégorie, ici on ne réagit qu'au compteur.
    void refreshChoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, couple?.code, couple?.choiceUnread]);

  useEffect(() => {
    if (!open || tab !== "choices") return;
    if (!choices.snapshot || choices.snapshot.unread === 0) return;

    const timer = window.setTimeout(() => {
      void markChoicesSeen();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [open, tab, choices.snapshot, markChoicesSeen]);

  const openSouvenirFromMatch = useCallback(
    (match: MatchSnapshot) => {
      const existing = souvenirs.souvenirs.find(
        (souvenir) => souvenir.ideaId === match.idea.id,
      );
      setSouvenirError(null);
      if (existing) {
        setSouvenirState({ mode: "note", souvenir: existing });
        return;
      }
      setSouvenirState({
        mode: "create",
        prefill: {
          ideaId: match.idea.id,
          title: match.idea.title,
          emoji: match.idea.emoji,
        },
      });
    },
    [souvenirs.souvenirs],
  );

  const openSouvenirFromNote = useCallback((souvenir: SouvenirSnapshot) => {
    setSouvenirError(null);
    setSouvenirState({ mode: "note", souvenir });
  }, []);

  const openNewSouvenir = useCallback(() => {
    setSouvenirError(null);
    setSouvenirState({ mode: "create", prefill: null });
  }, []);

  const handleCreateSouvenir = useCallback(
    async (input: Parameters<typeof souvenirs.create>[0]) => {
      setSouvenirBusy(true);
      setSouvenirError(null);
      try {
        await souvenirs.create(input);
        setSouvenirState(null);
        selectTab("souvenirs");
      } catch (caught) {
        setSouvenirError(
          errorMessage(caught, "Impossible d’enregistrer ce souvenir."),
        );
      } finally {
        setSouvenirBusy(false);
      }
    },
    [souvenirs, selectTab],
  );

  const handleSaveNote = useCallback(
    async (id: string, body: string) => {
      setSouvenirBusy(true);
      setSouvenirError(null);
      try {
        await souvenirs.saveNote(id, body);
        setSouvenirState(null);
      } catch (caught) {
        setSouvenirError(
          errorMessage(caught, "Impossible d’enregistrer votre moment."),
        );
      } finally {
        setSouvenirBusy(false);
      }
    },
    [souvenirs],
  );

  if (!open) return null;

  const tabs: { id: DuoDialogTab; label: string; count: number }[] = [
    { id: "matches", label: "Matchs", count: couple?.unread ?? 0 },
    {
      id: "souvenirs",
      label: "Souvenirs",
      count: souvenirs.souvenirs.length,
    },
    { id: "choices", label: "Choix", count: couple?.choiceUnread ?? 0 },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onPointerDown={(event) => {
          // Fermeture uniquement si le geste commence sur le fond : relâcher un
          // glissement au-dessus de la feuille ne doit pas la refermer.
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Espace à deux"
          className={`flex w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] transition-[height] duration-300 ease-out sm:h-auto sm:max-h-[85dvh] sm:rounded-[28px] ${
            isMobile
              ? couple
                ? expanded
                  ? "h-[94dvh]"
                  : "h-[78dvh]"
                : "max-h-[85dvh]"
              : "max-h-[85dvh]"
          }`}
        >
          {isMobile ? (
            <div className="flex shrink-0 justify-center pt-2">
              <motion.button
                {...sheetDragProps}
                type="button"
                onClick={() => {
                  if (dragMovedRef.current) {
                    dragMovedRef.current = false;
                    return;
                  }
                  setExpanded((current) => !current);
                }}
                aria-label={
                  expanded
                    ? "Réduire l’espace à deux"
                    : "Agrandir l’espace à deux en tirant vers le haut"
                }
                aria-expanded={expanded}
                className="group flex h-7 w-full touch-none items-center justify-center"
              >
                <span
                  className={`h-1.5 w-10 rounded-full transition ${
                    expanded ? "bg-cream/45" : "bg-white/20 group-hover:bg-white/40"
                  }`}
                />
              </motion.button>
            </div>
          ) : null}

          <motion.header
            {...sheetDragProps}
            className={`flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.07] px-5 pb-4 pt-2 sm:pt-4 ${
              isMobile ? "touch-none" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose to-[#7c5cff] text-ink-950">
                <UsersIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-soft/80">
                  Mode duo
                </p>
                <h2 className="mt-0.5 font-display text-[24px] leading-tight text-cream">
                  Votre espace à deux
                </h2>
              </div>
            </div>
            <div
              className="flex shrink-0 items-center gap-1.5"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {onToggleSound ? (
                <button
                  type="button"
                  onClick={onToggleSound}
                  aria-pressed={soundEnabled}
                  aria-label={
                    soundEnabled
                      ? "Couper le son des pensées"
                      : "Activer le son des pensées"
                  }
                  title={
                    soundEnabled
                      ? "Son des pensées activé"
                      : "Son des pensées coupé"
                  }
                  className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                    soundEnabled
                      ? "border-rose/25 bg-rose/10 text-rose-soft"
                      : "border-white/10 bg-white/[0.04] text-cream/35 hover:text-cream/65"
                  }`}
                >
                  <BellIcon className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer l’espace à deux"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cream/60 transition hover:border-white/20 hover:text-cream"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.header>

          {couple ? (
            <div className="flex gap-1 border-b border-white/[0.07] px-3 py-2">
              {tabs.map((item) => {
                const active = tab === item.id;
                const Icon =
                  item.id === "matches"
                    ? HeartIcon
                    : item.id === "souvenirs"
                      ? BookIcon
                      : CardsIcon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    aria-pressed={active}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-medium transition ${
                      active
                        ? "bg-white/[0.09] text-cream"
                        : "text-cream/45 hover:text-cream/75"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.count > 0 ? (
                      <span
                        className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold leading-none ${
                          item.id === "souvenirs"
                            ? "bg-white/10 text-cream/60"
                            : "bg-rose text-ink-950"
                        }`}
                      >
                        {item.count > 9 ? "9+" : item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {error ? (
              <p
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[12px] leading-relaxed text-rose-soft"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}

            {couple ? (
              <>
                {tab === "matches" ? (
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/45">
                            Code d’invitation
                          </p>
                          <p className="mt-1 font-display text-[30px] leading-none tracking-[0.18em] text-cream">
                            {couple.code}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onCopyCode}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-[11.5px] font-medium text-cream/75 transition hover:border-white/25 hover:text-cream"
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                          Copier
                        </button>
                      </div>

                      <div
                        className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11.5px] ${
                          couple.complete
                            ? "border-mint/25 bg-mint/[0.07] text-mint"
                            : "border-gold/25 bg-gold/[0.07] text-gold"
                        }`}
                      >
                        {couple.complete ? (
                          <CheckIcon className="h-4 w-4 shrink-0" />
                        ) : (
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-gold" />
                        )}
                        <span>
                          {couple.complete
                            ? "Vous êtes deux. Chaque idée aimée en commun apparaît ici."
                            : "En attente de votre partenaire. Envoyez-lui ce code : il le saisit dans l’app, de son côté."}
                        </span>
                      </div>
                      <p className="mt-2 text-[10.5px] leading-relaxed text-cream/35">
                        {couple.memberCount} / 2 membre
                        {couple.memberCount > 1 ? "s" : ""} · le code n’est
                        visible que dans cet espace.
                      </p>
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/50">
                          <HeartIcon className="h-3.5 w-3.5 text-rose" />
                          Vos matchs
                          <span className="rounded-full bg-rose/15 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-rose-soft">
                            {couple.matches.length}
                          </span>
                        </h3>
                        {couple.unread > 0 ? (
                          <button
                            type="button"
                            onClick={() => void onMarkSeen()}
                            className="rounded-lg px-1.5 py-1 text-[10.5px] text-cream/40 transition hover:bg-white/5 hover:text-cream/70"
                          >
                            Tout marquer comme vu
                          </button>
                        ) : null}
                      </div>

                      {couple.matches.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-6 text-center">
                          <span aria-hidden className="text-3xl">
                            💞
                          </span>
                          <p className="mt-2 text-[12.5px] font-medium text-cream/80">
                            Aucun match pour l’instant
                          </p>
                          <p className="mx-auto mt-1 max-w-[280px] text-[11px] leading-relaxed text-cream/45">
                            Swipez chacun de votre côté. Dès que vous gardez la
                            même idée, elle apparaît ici et vous êtes prévenus
                            tous les deux.
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {couple.matches.map((match) => {
                            const theme =
                              THEME_META[match.idea.themes[0] ?? "detente"];
                            const souvenir = souvenirs.souvenirs.find(
                              (item) => item.ideaId === match.idea.id,
                            );
                            const souvenirLabel = !souvenir
                              ? "Raconter ce date"
                              : souvenir.complete
                                ? "Voir le souvenir"
                                : souvenir.mine
                                  ? "Compléter le souvenir"
                                  : "Écrire mon moment";
                            return (
                              <li
                                key={match.idea.id}
                                className={`relative flex gap-3 rounded-2xl border p-3 ${
                                  match.seen
                                    ? "border-white/10 bg-white/[0.03]"
                                    : "border-rose/35 bg-rose/[0.08]"
                                }`}
                              >
                                {!match.seen ? (
                                  <span
                                    aria-label="Nouveau match"
                                    className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose"
                                  />
                                ) : null}
                                <div
                                  aria-hidden
                                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[22px] ring-1 ring-white/15"
                                  style={{
                                    backgroundImage: `linear-gradient(145deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                                  }}
                                >
                                  {match.idea.emoji}
                                </div>
                                <div className="min-w-0 flex-1 pr-3">
                                  <p className="font-display text-[16px] leading-tight text-cream">
                                    {match.idea.title}
                                  </p>
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-cream/50">
                                    {match.idea.tagline}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[10px] text-cream/30">
                                      Match le{" "}
                                      {formatMatchDate(match.matchedAt)}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openSouvenirFromMatch(match)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-mint/20 bg-mint/[0.06] px-2 py-1 text-[10px] font-medium text-mint transition hover:border-mint/40 hover:bg-mint/10"
                                    >
                                      {souvenirLabel}
                                      <ArrowRightIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    <section className="border-t border-white/[0.07] pt-4">
                      {confirmLeave ? (
                        <div className="rounded-xl border border-rose/30 bg-rose/[0.07] p-3">
                          <p className="text-[11.5px] leading-relaxed text-rose-soft">
                            Quitter supprime les matchs, les souvenirs, les choix
                            et les pensées partagées pour vous deux. Votre
                            partenaire devra ressaisir un code.
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void onLeave()}
                              disabled={busy}
                              className="rounded-lg bg-rose px-3 py-1.5 text-[11.5px] font-semibold text-ink-950 transition hover:brightness-105 disabled:opacity-40"
                            >
                              {busy ? "Suppression…" : "Oui, quitter"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmLeave(false)}
                              className="rounded-lg px-3 py-1.5 text-[11.5px] text-cream/60 transition hover:bg-white/5 hover:text-cream"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmLeave(true)}
                          className="text-[11px] text-cream/35 underline-offset-4 transition hover:text-rose-soft hover:underline"
                        >
                          Quitter l’espace à deux
                        </button>
                      )}
                    </section>
                  </div>
                ) : null}

                {tab === "souvenirs" ? (
                  complete ? (
                    <SouvenirTimeline
                      souvenirs={souvenirs.souvenirs}
                      loading={souvenirs.loading}
                      error={souvenirs.error}
                      onAdd={openNewSouvenir}
                      onEditMine={openSouvenirFromNote}
                    />
                  ) : (
                    <WaitingPartner
                      code={couple.code}
                      onCopyCode={onCopyCode}
                      text="Votre journal s’ouvrira dès que votre partenaire aura rejoint l’espace."
                    />
                  )
                ) : null}

                {tab === "choices" ? (
                  complete ? (
                    <ChoiceDeck
                      category={choices.category}
                      onCategoryChange={choices.setCategory}
                      snapshot={choices.snapshot}
                      loading={choices.loading}
                      error={choices.error}
                      pending={choices.pending}
                      onSwipe={(choice, direction) =>
                        void choices.swipe(choice, direction)
                      }
                      onRefresh={() => void choices.refresh()}
                    />
                  ) : (
                    <WaitingPartner
                      code={couple.code}
                      onCopyCode={onCopyCode}
                      text="Les cartes Nourriture et Films arrivent quand vous êtes deux."
                    />
                  )
                ) : null}
              </>
            ) : (
              <div className="space-y-5">
                <p className="text-[12.5px] leading-relaxed text-cream/60">
                  Créez un espace, partagez le code à six caractères, et swipez
                  chacun sur votre téléphone. Vos envies restent personnelles :
                  seules les idées aimées en commun sont révélées.
                </p>

                <button
                  type="button"
                  onClick={() => void onCreate()}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose to-[#ff8f6b] px-5 py-3 text-[13px] font-semibold text-ink-950 shadow-[0_14px_30px_-14px_rgba(255,107,149,0.9)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UsersIcon className="h-4 w-4" />
                  {busy ? "Création…" : "Créer notre espace à deux"}
                </button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-cream/30">
                    ou
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!busy && code.replace(/[\s-]/g, "").length >= 4) {
                      void onJoin(code);
                    }
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                >
                  <label
                    htmlFor="duo-code"
                    className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cream/50"
                  >
                    Rejoindre avec un code
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="duo-code"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.toUpperCase())
                      }
                      placeholder="ABC123"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      maxLength={8}
                      className="min-w-0 flex-1 rounded-xl border border-white/12 bg-ink-950/60 px-3 py-2.5 font-display text-[20px] tracking-[0.18em] text-cream placeholder:text-cream/20 focus:border-rose/60 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={busy || code.replace(/[\s-]/g, "").length < 4}
                      className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[12px] font-medium text-cream/85 transition hover:border-white/30 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? "…" : "Rejoindre"}
                    </button>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[10px] leading-relaxed text-cream/30">
                    <SparklesIcon className="h-3 w-3 shrink-0" />
                    Le code vous est donné par votre partenaire depuis son app.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <SouvenirDialog
        open={souvenirState !== null}
        mode={souvenirState?.mode ?? "create"}
        souvenir={
          souvenirState?.mode === "note" ? souvenirState.souvenir : null
        }
        prefill={
          souvenirState?.mode === "create" ? souvenirState.prefill : null
        }
        busy={souvenirBusy}
        error={souvenirError}
        onClose={() => {
          if (souvenirBusy) return;
          setSouvenirState(null);
          setSouvenirError(null);
        }}
        onCreate={handleCreateSouvenir}
        onSaveNote={handleSaveNote}
      />
    </>
  );
}

function WaitingPartner({
  code,
  onCopyCode,
  text,
}: {
  code: string;
  onCopyCode: () => void;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-5 py-8 text-center">
      <span aria-hidden className="text-3xl">
        ⏳
      </span>
      <p className="mt-2 font-display text-[18px] text-cream">
        En attente de votre partenaire
      </p>
      <p className="mx-auto mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-cream/45">
        {text}
      </p>
      <button
        type="button"
        onClick={onCopyCode}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[10.5px] text-cream/65 transition hover:border-white/25 hover:text-cream"
      >
        <CopyIcon className="h-3 w-3" />
        Copier le code {code}
      </button>
    </div>
  );
}

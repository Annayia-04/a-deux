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
  // Évite de recréer un souvenir si seul l'envoi des photos a échoué.
  const pendingSouvenirRef = useRef<string | null>(null);
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
    pendingSouvenirRef.current = null;
    setSouvenirError(null);
    setSouvenirState({ mode: "note", souvenir });
  }, []);

  const openNewSouvenir = useCallback(() => {
    pendingSouvenirRef.current = null;
    setSouvenirError(null);
    setSouvenirState({ mode: "create", prefill: null });
  }, []);

  const handleCreateSouvenir = useCallback(
    async (
      input: Parameters<typeof souvenirs.create>[0],
      photos: File[],
    ) => {
      setSouvenirBusy(true);
      setSouvenirError(null);
      try {
        let createdId = pendingSouvenirRef.current;
        if (!createdId) {
          const created = await souvenirs.create(input);
          createdId = created.id;
          pendingSouvenirRef.current = createdId;
        }
        if (photos.length > 0) {
          await souvenirs.addPhotos(createdId, photos);
        }
        pendingSouvenirRef.current = null;
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
    async (id: string, body: string, photos: File[]) => {
      setSouvenirBusy(true);
      setSouvenirError(null);
      try {
        if (body.trim().length > 0) {
          await souvenirs.saveNote(id, body);
        }
        if (photos.length > 0) {
          await souvenirs.addPhotos(id, photos);
        }
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

  const handleDeleteSouvenirPhoto = useCallback(
    async (photoId: string) => {
      setSouvenirError(null);
      try {
        const updated = await souvenirs.deletePhoto(photoId);
        setSouvenirState((current) =>
          current?.mode === "note" && current.souvenir.id === updated.id
            ? { mode: "note", souvenir: updated }
            : current,
        );
      } catch (caught) {
        setSouvenirError(
          errorMessage(caught, "Impossible de retirer cette photo."),
        );
        throw caught;
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
          className={`flex w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-gold/25 bg-ink-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] transition-[height] duration-300 ease-out sm:h-auto sm:max-h-[85vh] sm:max-h-[85dvh] sm:rounded-[28px] ${
            isMobile
              ? couple
                ? expanded
                  ? "h-[94vh] h-[94dvh]"
                  : "h-[78dvh]"
                : "max-h-[85vh] max-h-[85dvh]"
              : "max-h-[85vh] max-h-[85dvh]"
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
                    expanded ? "bg-gold/60" : "bg-gold/25 group-hover:bg-gold/45"
                  }`}
                />
              </motion.button>
            </div>
          ) : null}

          <motion.header
            {...sheetDragProps}
            className={`flex shrink-0 items-start justify-between gap-3 border-b border-gold/12 px-5 pb-4 pt-2 sm:pt-4 ${
              isMobile ? "touch-none" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-gold/40 bg-gradient-to-br from-ember via-rose to-[#3d0a12] text-gold">
                <UsersIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/85">
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
                  className={`grid h-11 w-11 place-items-center rounded-full border transition ${
                    soundEnabled
                      ? "border-gold/35 bg-gold/10 text-gold"
                      : "border-gold/15 bg-ink-800/60 text-ash hover:text-cream/65"
                  }`}
                >
                  <BellIcon className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer l’espace à deux"
                className="grid h-11 w-11 place-items-center rounded-full border border-gold/20 bg-ink-800/60 text-cream/60 transition hover:border-gold/40 hover:text-cream"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </motion.header>

          {couple ? (
            <div className="flex gap-1 border-b border-gold/12 px-3 py-2">
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
                        ? "bg-gold/[0.1] text-cream shadow-[inset_0_-1px_0_rgba(197,160,89,0.65)]"
                        : "text-ash hover:text-cream/75"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.count > 0 ? (
                      <span
                        className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold leading-none ${
                          item.id === "souvenirs"
                            ? "bg-ink-700 text-cream/60"
                            : "bg-rose text-cream ring-1 ring-gold/40"
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
                    <section className="grimoire rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">
                            Code d’invitation
                          </p>
                          <p className="mt-1 font-display text-[30px] leading-none tracking-[0.2em] text-gold">
                            {couple.code}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onCopyCode}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.06] px-3 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/55 hover:bg-gold/10"
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
                      <p className="mt-2 text-[10.5px] leading-relaxed text-ash">
                        {couple.memberCount} / 2 membre
                        {couple.memberCount > 1 ? "s" : ""} · le code n’est
                        visible que dans cet espace.
                      </p>
                    </section>

                    <section>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold/80">
                          <HeartIcon className="h-3.5 w-3.5 text-rose" />
                          Vos matchs
                          <span className="rounded-full bg-rose/25 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-rose-soft">
                            {couple.matches.length}
                          </span>
                        </h3>
                        {couple.unread > 0 ? (
                          <button
                            type="button"
                            onClick={() => void onMarkSeen()}
                            className="rounded-lg px-1.5 py-1 text-[10.5px] text-ash transition hover:bg-white/5 hover:text-cream/70"
                          >
                            Tout marquer comme vu
                          </button>
                        ) : null}
                      </div>

                      {couple.matches.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gold/20 bg-ink-850/60 px-4 py-6 text-center">
                          <span aria-hidden className="text-3xl">
                            🥀
                          </span>
                          <p className="mt-2 text-[12.5px] font-medium text-cream/80">
                            Aucun match pour l’instant
                          </p>
                          <p className="mx-auto mt-1 max-w-[280px] text-[11px] leading-relaxed text-ash">
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
                                    ? "border-gold/15 bg-ink-850/70"
                                    : "border-rose/45 bg-rose/[0.12]"
                                }`}
                              >
                                {!match.seen ? (
                                  <span
                                    aria-label="Nouveau match"
                                    className="absolute right-2.5 top-2.5 h-2 w-2 rotate-45 bg-gold"
                                  />
                                ) : null}
                                <div
                                  aria-hidden
                                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[22px] ring-1 ring-gold/25"
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
                                  <p className="mt-0.5 line-clamp-1 text-[11px] text-cream/55">
                                    {match.idea.tagline}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[10px] text-ash">
                                      Match le{" "}
                                      {formatMatchDate(match.matchedAt)}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openSouvenirFromMatch(match)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/[0.06] px-2 py-1 text-[10px] font-medium text-gold transition hover:border-gold/55 hover:bg-gold/10"
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

                    <section className="border-t border-gold/12 pt-4">
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
                              className="rounded-lg border border-gold/40 bg-rose px-3 py-1.5 text-[11.5px] font-semibold text-cream transition hover:brightness-110 disabled:opacity-40"
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
                          className="text-[11px] text-ash underline-offset-4 transition hover:text-rose-soft hover:underline"
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
                      onDeletePhoto={handleDeleteSouvenirPhoto}
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
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-5 py-3 text-[13px] font-semibold text-cream shadow-[0_14px_30px_-16px_rgba(158,25,45,0.95)] transition hover:border-gold/70 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UsersIcon className="h-4 w-4" />
                  {busy ? "Création…" : "Créer notre espace à deux"}
                </button>

                <div className="flex items-center gap-3">
                  <span className="rule-ornament h-px flex-1" />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-ash">
                    ou
                  </span>
                  <span className="rule-ornament h-px flex-1" />
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!busy && code.replace(/[\s-]/g, "").length >= 4) {
                      void onJoin(code);
                    }
                  }}
                  className="grimoire rounded-2xl p-3.5"
                >
                  <label
                    htmlFor="duo-code"
                    className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cream/55"
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
                      className="min-w-0 flex-1 rounded-xl border border-gold/25 bg-ink-950/70 px-3 py-2.5 font-display text-[20px] tracking-[0.2em] text-cream placeholder:text-ash focus:border-gold/60 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={busy || code.replace(/[\s-]/g, "").length < 4}
                      className="shrink-0 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-2.5 text-[12px] font-medium text-gold transition hover:border-gold/55 hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? "…" : "Rejoindre"}
                    </button>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-[10px] leading-relaxed text-ash">
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
          pendingSouvenirRef.current = null;
          setSouvenirState(null);
          setSouvenirError(null);
        }}
        onCreate={handleCreateSouvenir}
        onSaveNote={handleSaveNote}
        onDeletePhoto={handleDeleteSouvenirPhoto}
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
    <div className="rounded-2xl border border-dashed border-gold/20 bg-ink-850/60 px-5 py-8 text-center">
      <span aria-hidden className="text-3xl">
        ⏳
      </span>
      <p className="mt-2 font-display text-[18px] text-cream">
        En attente de votre partenaire
      </p>
      <p className="mx-auto mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-ash">
        {text}
      </p>
      <button
        type="button"
        onClick={onCopyCode}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/[0.06] px-2.5 py-1.5 text-[10.5px] text-gold transition hover:border-gold/55 hover:text-cream"
      >
        <CopyIcon className="h-3 w-3" />
        Copier le code {code}
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { DuoDialog, type DuoDialogTab } from "@/components/duo-dialog";
import {
  MatchCelebration,
  type CelebrationData,
} from "@/components/match-celebration";
import { ResultsView } from "@/components/results-view";
import { SetupScreen } from "@/components/setup-screen";
import { SwipeScreen } from "@/components/swipe-screen";
import { TapPulse } from "@/components/tap-pulse";
import {
  AlertIcon,
  CheckIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import { ApiError, api } from "@/lib/api-client";
import { CHOICES_BY_ID, CHOICE_CATEGORY_META } from "@/lib/choices";
import { summarizePrefs, THEME_META } from "@/lib/preferences";
import { buildShareText } from "@/lib/share";
import {
  DEFAULT_PREFS,
  type Choice,
  type ChoiceMatchSummary,
  type Idea,
  type Prefs,
  type SessionSnapshot,
  type SwipeDirection,
} from "@/lib/types";
import { useCoupleSync } from "@/lib/use-couple-sync";
import { useSwipeSync } from "@/lib/use-swipe-sync";
import { useTaps } from "@/lib/use-taps";

type Mode = "setup" | "swiping" | "results";
type LocalDecision = { ideaId: string; direction: SwipeDirection };
type ToastTone = "info" | "success" | "error";
type ToastState = { id: number; message: string; tone: ToastTone };

function initialMode(session: SessionSnapshot | null): Mode {
  if (!session) return "setup";
  return session.ideas.length > 0 ? "swiping" : "results";
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Repli pour les contextes non sécurisés / anciens navigateurs.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Copie impossible");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function celebrationForIdea(idea: Idea): CelebrationData {
  const theme = THEME_META[idea.themes[0] ?? "detente"];
  return {
    id: idea.id,
    emoji: idea.emoji,
    title: idea.title,
    subtitle: `${idea.tagline} Vous êtes maintenant prévenus tous les deux.`,
    gradient: theme.gradient,
    kicker: "Match à deux",
    heading: "Vous aimez la même idée",
    ctaLabel: "Voir notre duo",
    duoTab: "matches",
  };
}

function celebrationForChoice(choice: Choice): CelebrationData {
  const meta = CHOICE_CATEGORY_META[choice.category];
  return {
    id: `${choice.category}:${choice.id}`,
    emoji: choice.emoji,
    title: choice.title,
    subtitle: "Vous aimez la même carte. Il ne reste plus qu'à passer à table ou à lancer le film.",
    gradient: meta.gradient,
    kicker: `Match ${meta.label.toLowerCase()}`,
    heading: "Vous aimez la même carte",
    ctaLabel: "Voir nos choix",
    duoTab: "choices",
  };
}

export function DateSwipeApp({
  initialSession,
}: {
  initialSession: SessionSnapshot | null;
}) {
  const [session, setSession] = useState<SessionSnapshot | null>(initialSession);
  const [mode, setMode] = useState<Mode>(() => initialMode(initialSession));
  const [returnMode, setReturnMode] = useState<Mode>("swiping");
  const [editing, setEditing] = useState(false);
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<LocalDecision[]>([]);
  const [liked, setLiked] = useState<Idea[]>(initialSession?.likedIdeas ?? []);
  const [draftPrefs, setDraftPrefs] = useState<Prefs>(
    initialSession?.prefs ?? DEFAULT_PREFS,
  );
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [duoOpen, setDuoOpen] = useState(false);
  const [duoBusy, setDuoBusy] = useState(false);
  const [duoError, setDuoError] = useState<string | null>(null);
  const [duoInitialTab, setDuoInitialTab] =
    useState<DuoDialogTab>("matches");
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationData[]>(
    [],
  );
  const [activeCelebration, setActiveCelebration] =
    useState<CelebrationData | null>(null);
  const [incomingTap, setIncomingTap] = useState<number | null>(null);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      setToast({ id: Date.now(), message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSessionExpired = useCallback(() => {
    setSession(null);
    setLiked([]);
    setDecisions([]);
    setIndex(0);
    setEditing(false);
    setMode("setup");
    setStartError("Votre session a expiré. Relancez une sélection.");
    setDuoOpen(false);
    setDuoError(null);
    setCelebrationQueue([]);
    setActiveCelebration(null);
    setIncomingTap(null);
    showToast("Session expirée. Relancez une sélection.", "error");
  }, [showToast]);

  const enqueueCelebration = useCallback((data: CelebrationData) => {
    setCelebrationQueue((current) =>
      current.some((queued) => queued.id === data.id)
        ? current
        : [...current, data],
    );
  }, []);

  const enqueueMatch = useCallback(
    (idea: Idea) => enqueueCelebration(celebrationForIdea(idea)),
    [enqueueCelebration],
  );

  const handleNewChoiceMatch = useCallback(
    (match: ChoiceMatchSummary) => {
      const choice = CHOICES_BY_ID.get(match.choiceId);
      if (!choice) return;
      enqueueCelebration(celebrationForChoice(choice));
      showToast(`Nouveau match : ${choice.title}`, "success");
    },
    [enqueueCelebration, showToast],
  );

  const coupleSync = useCoupleSync({
    initial: initialSession?.couple ?? null,
    enabled: Boolean(session),
    onNewMatch: enqueueMatch,
    onNewChoiceMatch: handleNewChoiceMatch,
    onSessionExpired: handleSessionExpired,
  });

  const {
    couple,
    refresh: refreshCouple,
    update: updateCouple,
    markKnown,
    markChoiceKnown,
    markSeen,
    reset: resetCouple,
  } = coupleSync;

  useEffect(() => {
    if (activeCelebration || celebrationQueue.length === 0) return;
    setActiveCelebration(celebrationQueue[0] ?? null);
    setCelebrationQueue((current) => current.slice(1));
  }, [activeCelebration, celebrationQueue]);

  useEffect(() => {
    if (session) return;
    resetCouple();
    setDuoOpen(false);
    setCelebrationQueue([]);
    setActiveCelebration(null);
    setIncomingTap(null);
  }, [session, resetCouple]);

  const handleIncomingTap = useCallback(() => {
    setIncomingTap(Date.now());
    showToast("Une pensée de votre partenaire 💗", "success");
  }, [showToast]);

  const clearIncomingTap = useCallback(() => setIncomingTap(null), []);

  const { send: sendTap } = useTaps({
    enabled: Boolean(session && couple?.complete),
    coupleCode: couple?.code ?? null,
    onTap: handleIncomingTap,
    onSessionExpired: handleSessionExpired,
  });

  const handleSendTap = useCallback(async () => {
    await sendTap();
    showToast("Pensée envoyée à votre partenaire.", "success");
  }, [sendTap, showToast]);

  const handleSwipeMatch = useCallback(
    (idea: Idea) => {
      markKnown(idea.id);
      enqueueMatch(idea);
      void refreshCouple({ notify: false });
      showToast(
        `Vous aimez la même idée : ${idea.title}`,
        "success",
      );
    },
    [enqueueMatch, markKnown, refreshCouple, showToast],
  );

  const handleChoiceMatch = useCallback(
    (choice: Choice) => {
      markChoiceKnown(choice.category, choice.id);
      enqueueCelebration(celebrationForChoice(choice));
    },
    [enqueueCelebration, markChoiceKnown],
  );

  const {
    enqueue,
    retry: retrySync,
    reset: resetSync,
    pending,
    offline,
    error: syncError,
  } = useSwipeSync({
    onSessionExpired: handleSessionExpired,
    onMatch: handleSwipeMatch,
  });

  const remaining = session ? Math.max(0, session.ideas.length - index) : 0;
  const swiped = (session?.swiped ?? 0) + decisions.length;
  const likedCount = liked.length;
  const prefsSummary = session ? summarizePrefs(session.prefs) : "";

  const handleDecide = useCallback(
    (idea: Idea, direction: SwipeDirection) => {
      setLiked((current) =>
        direction === "like" ? [idea, ...current] : current,
      );
      setDecisions((current) => [
        ...current,
        { ideaId: idea.id, direction },
      ]);
      setIndex((current) => current + 1);
      enqueue(idea.id, direction);
    },
    [enqueue],
  );

  const handleUndo = useCallback(async () => {
    if (undoBusy || decisions.length === 0) return;

    if (pending > 0 || offline) {
      showToast("Patientez pendant la synchronisation avant d’annuler.", "info");
      return;
    }

    const last = decisions[decisions.length - 1];
    if (!last) return;

    setUndoBusy(true);
    try {
      const result = await api.undo();
      if (result.ideaId !== last.ideaId) {
        showToast("L’annulation n’a pas pu être synchronisée.", "error");
        return;
      }

      setDecisions((current) => current.slice(0, -1));
      setIndex((current) => Math.max(0, current - 1));
      if (last.direction === "like") {
        setLiked((current) => current.filter((idea) => idea.id !== last.ideaId));
      }
      if (mode === "results") setMode("swiping");
      // Un match peut disparaître si l'un des deux likes est annulé.
      void refreshCouple({ notify: false });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleSessionExpired();
        return;
      }
      showToast(
        errorMessage(error, "Impossible d’annuler cette carte."),
        "error",
      );
    } finally {
      setUndoBusy(false);
    }
  }, [
    decisions,
    offline,
    pending,
    undoBusy,
    mode,
    showToast,
    handleSessionExpired,
    refreshCouple,
  ]);

  const handleStart = useCallback(
    async (prefs: Prefs) => {
      setStarting(true);
      setStartError(null);
      setDuoError(null);
      resetSync();

      try {
        const snapshot = await api.createSession(prefs);
        setSession(snapshot);
        setDraftPrefs(snapshot.prefs);
        setLiked(snapshot.likedIdeas);
        setDecisions([]);
        setIndex(0);
        setEditing(false);
        setMode(snapshot.ideas.length > 0 ? "swiping" : "results");
        updateCouple(snapshot.couple);
        showToast("Votre sélection est prête.", "success");
      } catch (error) {
        setStartError(
          errorMessage(error, "Impossible de démarrer la sélection."),
        );
      } finally {
        setStarting(false);
      }
    },
    [resetSync, showToast, updateCouple],
  );

  /** Crée une session avec les préférences courantes si nécessaire. */
  const ensureSession = useCallback(
    async (prefs: Prefs): Promise<SessionSnapshot | null> => {
      if (session) return session;

      setStarting(true);
      resetSync();
      try {
        const snapshot = await api.createSession(prefs);
        setSession(snapshot);
        setDraftPrefs(snapshot.prefs);
        setLiked(snapshot.likedIdeas);
        setDecisions([]);
        setIndex(0);
        setEditing(false);
        updateCouple(snapshot.couple);
        return snapshot;
      } finally {
        setStarting(false);
      }
    },
    [session, resetSync, updateCouple],
  );

  const handleCreateDuo = useCallback(
    async (prefs: Prefs) => {
      if (duoBusy) return;
      setDuoBusy(true);
      setDuoError(null);
      setStartError(null);

      try {
        const current = await ensureSession(prefs);
        if (!current) return;

        const result = await api.createCouple();
        updateCouple(result.couple);
        setMode("swiping");
        setDuoOpen(true);
        showToast(
          `Espace à deux créé. Partagez le code ${result.couple.code}.`,
          "success",
        );
      } catch (error) {
        setDuoError(
          errorMessage(error, "Impossible de créer l’espace à deux."),
        );
      } finally {
        setDuoBusy(false);
      }
    },
    [duoBusy, ensureSession, showToast, updateCouple],
  );

  const handleJoinDuo = useCallback(
    async (prefs: Prefs, code: string) => {
      if (duoBusy) return;
      setDuoBusy(true);
      setDuoError(null);
      setStartError(null);

      try {
        const current = await ensureSession(prefs);
        if (!current) return;

        const result = await api.joinCouple(code);
        updateCouple(result.couple);
        setMode("swiping");
        setDuoOpen(true);
        showToast(
          result.couple.complete
            ? "Vous avez rejoint votre partenaire. À vous de swiper !"
            : "Code accepté. En attente de votre partenaire.",
          "success",
        );
      } catch (error) {
        setDuoError(
          errorMessage(error, "Impossible de rejoindre cet espace à deux."),
        );
      } finally {
        setDuoBusy(false);
      }
    },
    [duoBusy, ensureSession, showToast, updateCouple],
  );

  const handleLeaveDuo = useCallback(async () => {
    if (duoBusy) return;
    setDuoBusy(true);
    setDuoError(null);

    try {
      await api.leaveCouple();
      updateCouple(null);
      setCelebrationQueue([]);
      setActiveCelebration(null);
      setIncomingTap(null);
      setDuoInitialTab("matches");
      showToast("Vous avez quitté l’espace à deux.", "success");
    } catch (error) {
      setDuoError(
        errorMessage(error, "Impossible de quitter l’espace à deux."),
      );
    } finally {
      setDuoBusy(false);
    }
  }, [duoBusy, showToast, updateCouple]);

  const handleResume = useCallback(() => {
    if (!session) {
      setMode("setup");
      return;
    }
    setEditing(false);
    setStartError(null);
    setMode(session.ideas.length > index ? "swiping" : "results");
  }, [session, index]);

  const openSettings = useCallback(() => {
    setReturnMode(mode === "setup" ? "swiping" : mode);
    setEditing(Boolean(session));
    setStartError(null);
    setDuoError(null);
    setMode("setup");
  }, [mode, session]);

  const handleNewSelection = useCallback(() => {
    setReturnMode("results");
    setEditing(false);
    setStartError(null);
    setMode("setup");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setStartError(null);
    setMode(returnMode);
  }, [returnMode]);

  const openResults = useCallback(() => {
    setEditing(false);
    setMode("results");
  }, []);

  const openDuoOn = useCallback(
    (tab: DuoDialogTab) => {
      setDuoError(null);
      setDuoInitialTab(tab);
      setDuoOpen(true);
      if (tab === "matches") void markSeen();
    },
    [markSeen],
  );

  const openDuo = useCallback(() => openDuoOn("matches"), [openDuoOn]);

  const closeDuo = useCallback(() => {
    setDuoOpen(false);
    setDuoError(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!session) return;
    try {
      await copyToClipboard(buildShareText(liked, session.prefs));
      showToast("Liste copiée dans le presse-papiers.", "success");
    } catch {
      showToast(
        "Copie impossible. Sélectionnez le texte de votre navigateur pour le partager.",
        "error",
      );
    }
  }, [liked, session, showToast]);

  const handleCopyDuoCode = useCallback(async () => {
    if (!couple) return;
    try {
      await copyToClipboard(couple.code);
      showToast(`Code ${couple.code} copié. Envoyez-le à votre partenaire.`, "success");
    } catch {
      showToast("Copie impossible. Notez le code affiché.", "error");
    }
  }, [couple, showToast]);

  const handleForget = useCallback(async () => {
    try {
      await api.deleteSession();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        showToast("Impossible d’effacer la session. Réessayez.", "error");
        return;
      }
    }

    resetSync();
    resetCouple();
    setSession(null);
    setLiked([]);
    setDecisions([]);
    setIndex(0);
    setEditing(false);
    setDraftPrefs(DEFAULT_PREFS);
    setMode("setup");
    setStartError(null);
    setDuoOpen(false);
    setDuoError(null);
    setCelebrationQueue([]);
    setActiveCelebration(null);
    setIncomingTap(null);
    showToast("Votre session et vos envies ont été effacées.", "success");
  }, [resetSync, resetCouple, showToast]);

  const closeCelebration = useCallback(() => {
    setActiveCelebration(null);
    void markSeen();
  }, [markSeen]);

  const openDuoFromCelebration = useCallback(() => {
    const tab = activeCelebration?.duoTab ?? "matches";
    setActiveCelebration(null);
    openDuoOn(tab);
  }, [activeCelebration, openDuoOn]);

  const resumeInfo = useMemo(() => {
    if (!session) return null;
    return { remaining, liked: likedCount };
  }, [session, remaining, likedCount]);

  return (
    <MotionConfig reducedMotion="user">
      {mode === "setup" ? (
        <SetupScreen
          initialPrefs={session?.prefs ?? draftPrefs}
          resume={editing ? null : resumeInfo}
          isEditing={editing}
          starting={starting}
          error={startError}
          couple={couple}
          duoBusy={duoBusy}
          duoError={duoError}
          onStart={handleStart}
          onResume={handleResume}
          onCancelEdit={cancelEdit}
          onCreateDuo={handleCreateDuo}
          onJoinDuo={handleJoinDuo}
          onManageDuo={openDuo}
          onCopyDuoCode={() => void handleCopyDuoCode()}
        />
      ) : null}

      {mode === "swiping" && session ? (
        <SwipeScreen
          ideas={session.ideas}
          index={index}
          total={session.total}
          swiped={swiped}
          likedCount={likedCount}
          prefsSummary={prefsSummary}
          duoActive={couple !== null}
          duoUnread={couple?.unread ?? 0}
          tapEnabled={couple?.complete === true}
          onSendTap={handleSendTap}
          onTapError={(message) => showToast(message, "error")}
          canUndo={
            decisions.length > 0 && pending === 0 && !offline && !undoBusy
          }
          undoBusy={undoBusy}
          pending={pending}
          offline={offline}
          syncError={syncError}
          onDecide={handleDecide}
          onUndo={() => void handleUndo()}
          onRetrySync={retrySync}
          onOpenSettings={openSettings}
          onOpenResults={openResults}
          onOpenDuo={openDuo}
        />
      ) : null}

      {mode === "results" && session ? (
        <ResultsView
          likedIdeas={liked}
          prefs={session.prefs}
          total={session.total}
          swiped={swiped}
          remaining={remaining}
          couple={couple}
          onResume={() => setMode("swiping")}
          onRestart={handleNewSelection}
          onCopy={() => void handleCopy()}
          onForget={handleForget}
          onOpenDuo={openDuo}
        />
      ) : null}

      <DuoDialog
        open={duoOpen}
        couple={couple}
        busy={duoBusy}
        error={duoError}
        initialTab={duoInitialTab}
        onChoiceMatch={handleChoiceMatch}
        onClose={closeDuo}
        onCreate={async () => {
          if (!session) {
            setDuoError("Choisissez d’abord vos envies pour créer un duo.");
            return;
          }
          if (duoBusy) return;
          setDuoBusy(true);
          setDuoError(null);
          try {
            const result = await api.createCouple();
            updateCouple(result.couple);
            showToast(
              `Espace à deux créé. Partagez le code ${result.couple.code}.`,
              "success",
            );
          } catch (error) {
            setDuoError(
              errorMessage(error, "Impossible de créer l’espace à deux."),
            );
          } finally {
            setDuoBusy(false);
          }
        }}
        onJoin={async (code) => {
          if (!session) {
            setDuoError("Choisissez d’abord vos envies pour rejoindre un duo.");
            return;
          }
          if (duoBusy) return;
          setDuoBusy(true);
          setDuoError(null);
          try {
            const result = await api.joinCouple(code);
            updateCouple(result.couple);
            showToast(
              result.couple.complete
                ? "Vous avez rejoint votre partenaire."
                : "Code accepté. En attente de votre partenaire.",
              "success",
            );
          } catch (error) {
            setDuoError(
              errorMessage(error, "Impossible de rejoindre cet espace à deux."),
            );
          } finally {
            setDuoBusy(false);
          }
        }}
        onLeave={handleLeaveDuo}
        onCopyCode={() => void handleCopyDuoCode()}
        onMarkSeen={() => void markSeen()}
      />

      <AnimatePresence>
        {activeCelebration ? (
          <MatchCelebration
            key={activeCelebration.id}
            data={activeCelebration}
            onClose={closeCelebration}
            onOpenDuo={openDuoFromCelebration}
          />
        ) : null}
      </AnimatePresence>

      {incomingTap ? (
        <TapPulse onDone={clearIncomingTap} />
      ) : null}

      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.3, 0.8, 0.2, 1] }}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`fixed inset-x-0 bottom-4 z-[70] mx-auto flex w-[calc(100%-2rem)] max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
              toast.tone === "success"
                ? "border-mint/30 bg-[#0d1f1a]/95 text-mint"
                : toast.tone === "error"
                  ? "border-rose/35 bg-[#241019]/95 text-rose-soft"
                  : "border-white/15 bg-ink-800/95 text-cream/80"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {toast.tone === "success" ? (
                <CheckIcon className="h-4 w-4" />
              ) : toast.tone === "error" ? (
                <AlertIcon className="h-4 w-4" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
            </span>
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Fermer la notification"
              className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

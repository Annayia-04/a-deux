"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AppShell, type TabId } from "@/components/app-shell";
import { ChoiceFiltersSheet } from "@/components/choice-filters-sheet";
import { ChoicesDiscover } from "@/components/choices-discover";
import { DiscoverView } from "@/components/discover-view";
import { DuoDialog, type DuoDialogTab } from "@/components/duo-dialog";
import { DuoTab } from "@/components/duo-tab";
import { FiltersSheet } from "@/components/filters-sheet";
import { IdeaDetailSheet } from "@/components/idea-detail-sheet";
import {
  DateBuilderSheet,
  type BuilderOptions,
  type BuilderPrefill,
} from "@/components/date-builder-sheet";
import { MatchCelebration, type CelebrationData } from "@/components/match-celebration";
import { PassedSheet } from "@/components/passed-sheet";
import { ProfileView } from "@/components/profile-view";
import { TapPulse } from "@/components/tap-pulse";
import { UniverseSwitch, type Universe } from "@/components/universe-switch";
import { WishlistView } from "@/components/wishlist-view";
import {
  AlertIcon,
  CheckIcon,
  SlidersIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import { ApiError, api } from "@/lib/api-client";
import type { AuthProvider } from "@/lib/auth/provider";
import { CHOICES_BY_ID, CHOICE_CATEGORY_META } from "@/lib/choices";
import {
  installFeedbackUnlock,
  playTapChime,
  vibrateTap,
} from "@/lib/feedback";
import { THEME_META, countActivePrefs } from "@/lib/preferences";
import {
  readInviteCode,
  readLaunchAction,
  stripLaunchParams,
  type LaunchAction,
} from "@/lib/launch-action";
import {
  buildDuoInviteText,
  buildIdeaShareText,
  buildMatchShareText,
  buildShareText,
} from "@/lib/share";
import { useTapSoundPreference } from "@/lib/use-feedback";
import {
  DEFAULT_PREFS,
  type AccountSnapshot,
  type Choice,
  type ChoiceMatchSummary,
  type Idea,
  type Prefs,
  type SessionSnapshot,
  type SwipeDirection,
} from "@/lib/types";
import { useChoices } from "@/lib/use-choices";
import { useCoupleSync } from "@/lib/use-couple-sync";
import { useSwipeSync } from "@/lib/use-swipe-sync";
import { useTaps } from "@/lib/use-taps";
import { useWidgetPairing } from "@/lib/use-widget-pairing";
import { useNativeAuthListener } from "@/lib/native-auth";
import { usePushNotifications } from "@/lib/push-notifications";

type LocalDecision = { ideaId: string; direction: SwipeDirection };
type ToastTone = "info" | "success" | "error";
type ToastState = { id: number; message: string; tone: ToastTone };

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

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
    heading: "Vous êtes sur la même longueur d’onde !",
    ctaLabel: "Voir notre duo",
    duoTab: "matches",
    shareText: buildMatchShareText(idea),
    builder: { slot: "activity", id: idea.id },
  };
}

function celebrationForChoice(choice: Choice): CelebrationData {
  const meta = CHOICE_CATEGORY_META[choice.category];
  return {
    id: `${choice.category}:${choice.id}`,
    emoji: choice.emoji,
    title: choice.title,
    subtitle:
      "Vous aimez la même carte. Il ne reste plus qu'à passer à table ou à lancer le film.",
    gradient: meta.gradient,
    kicker: `Match ${meta.label.toLowerCase()}`,
    heading: "Vous êtes sur la même longueur d’onde !",
    ctaLabel: "Voir nos choix",
    duoTab: "choices",
    shareText: `On aime tous les deux « ${choice.title} » ${choice.emoji}. On se le fait ?`,
    builder: { slot: choice.category === "food" ? "food" : "movie", id: choice.id },
  };
}

export function DateSwipeApp({
  initialSession,
  account,
  authProviders,
}: {
  initialSession: SessionSnapshot | null;
  account: AccountSnapshot | null;
  authProviders: AuthProvider[];
}) {
  const [session, setSession] = useState<SessionSnapshot | null>(initialSession);
  const [tab, setTab] = useState<TabId>("decouvrir");
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
  const [duoBusy, setDuoBusy] = useState(false);
  const [duoError, setDuoError] = useState<string | null>(null);
  const [duoDialogOpen, setDuoDialogOpen] = useState(false);
  const [duoInitialTab, setDuoInitialTab] = useState<DuoDialogTab>("souvenirs");
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationData[]>(
    [],
  );
  const [activeCelebration, setActiveCelebration] =
    useState<CelebrationData | null>(null);
  const [incomingTap, setIncomingTap] = useState<number | null>(null);
  const [tapSoundEnabled, setTapSoundEnabled] = useTapSoundPreference();
  const [launchAction, setLaunchAction] = useState<LaunchAction>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [passedOpen, setPassedOpen] = useState(false);
  const [detailIdea, setDetailIdea] = useState<Idea | null>(null);
  const [universe, setUniverse] = useState<Universe>("activity");
  const [choiceFilter, setChoiceFilter] = useState<string | null>(null);
  const [choiceFiltersOpen, setChoiceFiltersOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderPrefill, setBuilderPrefill] = useState<BuilderPrefill>(null);
  const [detailSource, setDetailSource] = useState<"match" | "envie">("match");
  const [passedIdeas, setPassedIdeas] = useState<Idea[]>([]);
  const [passedLoading, setPassedLoading] = useState(false);
  const [passedError, setPassedError] = useState<string | null>(null);
  const [removingLikedId, setRemovingLikedId] = useState<string | null>(null);
  const [forgetting, setForgetting] = useState(false);
  const launchHandled = useRef(false);
  const inviteHandled = useRef(false);

  useEffect(() => installFeedbackUnlock(), []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      setToast({ id: Date.now(), message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Paramètres d'URL lus uniquement côté navigateur (pas de décalage SSR).
  useEffect(() => {
    setLaunchAction(readLaunchAction(window.location.search));
    const params = new URLSearchParams(window.location.search);
    if (params.get("duo") === "1") setTab("deux");
  }, []);

  // Les paramètres d'action ne doivent pas survivre à un rechargement.
  useEffect(() => {
    const search = window.location.search;
    const cleaned = stripLaunchParams(search);
    if (cleaned === new URLSearchParams(search).toString()) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${cleaned ? `?${cleaned}` : ""}${window.location.hash}`,
    );
  }, []);

  const handleSessionExpired = useCallback(() => {
    setSession(null);
    setLiked([]);
    setDecisions([]);
    setIndex(0);
    setStartError("Votre session a expiré. Relancez une sélection.");
    setDuoError(null);
    setDuoDialogOpen(false);
    setCelebrationQueue([]);
    setActiveCelebration(null);
    setIncomingTap(null);
    setFiltersOpen(false);
    setPassedOpen(false);
    setTab("decouvrir");
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
    setDuoDialogOpen(false);
    setCelebrationQueue([]);
    setActiveCelebration(null);
    setIncomingTap(null);
  }, [session, resetCouple]);

  const handleIncomingTap = useCallback(() => {
    vibrateTap();
    playTapChime();
    setIncomingTap(Date.now());
    showToast("Une pensée de votre partenaire 🥀", "success");
  }, [showToast]);

  const clearIncomingTap = useCallback(() => setIncomingTap(null), []);

  const { send: sendTap } = useTaps({
    enabled: Boolean(session && couple?.complete),
    coupleCode: couple?.code ?? null,
    onTap: handleIncomingTap,
    onSessionExpired: handleSessionExpired,
  });

  useWidgetPairing({
    enabled: Boolean(session && couple?.complete),
    onPaired: () =>
      showToast(
        "Widget « Petit ping » associé : touchez-le pour envoyer une pensée.",
        "success",
      ),
  });

  useNativeAuthListener({
    onSuccess: () => window.location.reload(),
    onError: (message) => showToast(message, "error"),
  });

  usePushNotifications({
    enabled: Boolean(session),
    onError: (message) => showToast(message, "error"),
  });

  const handleSendTap = useCallback(async () => {
    vibrateTap([12]);
    await sendTap();
    showToast("Pensée envoyée à votre partenaire.", "success");
  }, [sendTap, showToast]);

  const sendShortcutPing = useCallback(async () => {
    try {
      vibrateTap([12]);
      await sendTap();
      showToast("Petit ping envoyé à votre partenaire.", "success");
    } catch (caught) {
      showToast(
        caught instanceof ApiError
          ? caught.message
          : "Impossible d’envoyer le petit ping.",
        "error",
      );
    }
  }, [sendTap, showToast]);

  const handleSwipeMatch = useCallback(
    (idea: Idea) => {
      markKnown(idea.id);
      enqueueMatch(idea);
      void refreshCouple({ notify: false });
      showToast(`Vous aimez la même idée : ${idea.title}`, "success");
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

  const choices = useChoices({
    enabled: universe !== "activity" && couple?.complete === true,
    coupleCode: couple?.code ?? null,
    onMatch: handleChoiceMatch,
  });

  useEffect(() => {
    if (universe === "activity") return;
    choices.setCategory(universe);
  }, [choices.setCategory, universe]);

  const filteredChoices = useMemo(() => {
    const snapshot = choices.snapshot;
    if (!snapshot || !choiceFilter) return snapshot;
    const deck = snapshot.deck.filter((choice) =>
      choice.tags.includes(choiceFilter),
    );
    return { ...snapshot, deck, total: deck.length, swiped: 0 };
  }, [choiceFilter, choices.snapshot]);

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

  // Progression du deck courant : le total peut changer avec les filtres,
  // alors que la session conserve d'anciens swipes hors sélection.
  const remaining = session ? session.ideas.length - index : 0;
  const swiped = session
    ? Math.max(0, Math.min(session.total, session.total - remaining))
    : 0;
  const likedCount = liked.length;
  const activeFilters = useMemo(
    () => countActivePrefs(session?.prefs ?? draftPrefs),
    [session?.prefs, draftPrefs],
  );

  const handleDecide = useCallback(
    (idea: Idea, direction: SwipeDirection) => {
      setLiked((current) =>
        direction === "like" ? [idea, ...current] : current,
      );
      setDecisions((current) => [...current, { ideaId: idea.id, direction }]);
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
    showToast,
    handleSessionExpired,
    refreshCouple,
  ]);

  const applySnapshot = useCallback(
    (snapshot: SessionSnapshot) => {
      setSession(snapshot);
      setDraftPrefs(snapshot.prefs);
      setLiked(snapshot.likedIdeas);
      setDecisions([]);
      setIndex(0);
      updateCouple(snapshot.couple);
    },
    [updateCouple],
  );

  const handleApplyFilters = useCallback(
    async (prefs: Prefs) => {
      if (starting) return;
      if (pending > 0 || offline) {
        showToast("Patientez pendant la synchronisation des cartes.", "info");
        return;
      }

      setStarting(true);
      setStartError(null);
      try {
        const snapshot = session
          ? await api.updatePrefs(prefs)
          : await api.createSession(prefs);
        applySnapshot(snapshot);
        setFiltersOpen(false);
        setTab("decouvrir");
        showToast(
          session ? "Filtres appliqués. Bonne découverte !" : "Votre sélection est prête.",
          "success",
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleSessionExpired();
          return;
        }
        setStartError(
          errorMessage(error, "Impossible de préparer cette sélection."),
        );
      } finally {
        setStarting(false);
      }
    },
    [
      applySnapshot,
      handleSessionExpired,
      offline,
      pending,
      session,
      showToast,
      starting,
    ],
  );

  /** Crée une session avec les préférences courantes si nécessaire. */
  const ensureSession = useCallback(
    async (prefs: Prefs): Promise<SessionSnapshot | null> => {
      if (session) return session;
      setStarting(true);
      try {
        const snapshot = await api.createSession(prefs);
        applySnapshot(snapshot);
        return snapshot;
      } finally {
        setStarting(false);
      }
    },
    [applySnapshot, session],
  );

  const handleCreateDuo = useCallback(async () => {
    if (duoBusy) return;
    setDuoBusy(true);
    setDuoError(null);
    setStartError(null);

    try {
      const current = await ensureSession(draftPrefs);
      if (!current) return;
      const result = await api.createCouple();
      updateCouple(result.couple);
      setTab("deux");
      showToast(
        `Espace à deux créé. Partagez le code ${result.couple.code}.`,
        "success",
      );
    } catch (error) {
      setDuoError(errorMessage(error, "Impossible de créer l’espace à deux."));
    } finally {
      setDuoBusy(false);
    }
  }, [draftPrefs, duoBusy, ensureSession, showToast, updateCouple]);

  const handleJoinDuo = useCallback(
    async (code: string) => {
      if (duoBusy) return;
      setDuoBusy(true);
      setDuoError(null);
      setStartError(null);

      try {
        const current = await ensureSession(draftPrefs);
        if (!current) return;
        const result = await api.joinCouple(code);
        updateCouple(result.couple);
        setTab("deux");
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
    [draftPrefs, duoBusy, ensureSession, showToast, updateCouple],
  );

  // Lien d'invitation `?code=XXXXXX` : rejoint le duo automatiquement.
  const inviteCode = useRef<string | null>(
    typeof window === "undefined"
      ? null
      : readInviteCode(window.location.search),
  ).current;

  useEffect(() => {
    if (!inviteCode || inviteHandled.current) return;
    inviteHandled.current = true;

    void (async () => {
      setDuoBusy(true);
      try {
        const current = session ?? (await ensureSession(draftPrefs));
        if (!current) return;
        if (current.couple) {
          setTab("deux");
          showToast("Vous êtes déjà dans un espace à deux.", "info");
          return;
        }
        const result = await api.joinCouple(inviteCode);
        updateCouple(result.couple);
        setTab("deux");
        showToast(
          result.couple.complete
            ? "Vous avez rejoint votre partenaire."
            : "Code accepté. En attente de votre partenaire.",
          "success",
        );
      } catch (error) {
        setDuoError(
          errorMessage(error, "Ce lien d’invitation n’est plus valable."),
        );
        setTab("deux");
        showToast(
          errorMessage(error, "Ce lien d’invitation n’est plus valable."),
          "error",
        );
      } finally {
        setDuoBusy(false);
      }
    })();
  }, [draftPrefs, ensureSession, inviteCode, session, showToast, updateCouple]);

  const handleDissolveDuo = useCallback(async () => {
    if (duoBusy) return;
    setDuoBusy(true);
    setDuoError(null);

    try {
      await api.dissolveCouple();
      updateCouple(null);
      setDetailIdea(null);
      setCelebrationQueue([]);
      setActiveCelebration(null);
      setIncomingTap(null);
      showToast("Votre espace à deux a été dissous.", "success");
    } catch (error) {
      setDuoError(
        errorMessage(error, "Impossible de dissoudre l’espace à deux."),
      );
    } finally {
      setDuoBusy(false);
    }
  }, [duoBusy, showToast, updateCouple]);

  // Exécute une seule fois l'action demandée par le raccourci installé.
  useEffect(() => {
    if (!launchAction || launchHandled.current) return;
    launchHandled.current = true;
    setLaunchAction(null);

    if (launchAction === "duo") {
      setTab("deux");
      return;
    }

    if (!session) {
      showToast(
        "Créez votre sélection pour envoyer un petit ping à votre partenaire.",
        "info",
      );
      return;
    }
    if (!couple?.complete) {
      setTab("deux");
      showToast(
        "Votre duo doit être complet pour envoyer un petit ping.",
        "info",
      );
      return;
    }

    void sendShortcutPing();
  }, [launchAction, session, couple, sendShortcutPing, showToast]);

  const copyText = useCallback(
    async (text: string, success: string) => {
      try {
        await copyToClipboard(text);
        showToast(success, "success");
        return true;
      } catch {
        showToast("Copie impossible. Sélectionnez le texte à la main.", "error");
        return false;
      }
    },
    [showToast],
  );

  const shareOrCopy = useCallback(
    async (payload: { title: string; text: string; url: string }) => {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share(payload);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }
      await copyText(`${payload.text}\n${payload.url}`, "Lien copié dans le presse-papiers.");
    },
    [copyText],
  );

  const handleCopyWishlist = useCallback(async () => {
    if (!session) return;
    await copyText(
      buildShareText(liked, session.prefs),
      "Liste copiée dans le presse-papiers.",
    );
  }, [copyText, liked, session]);

  const handleCopyDuoCode = useCallback(async () => {
    if (!couple) return;
    await copyText(
      couple.code,
      `Code ${couple.code} copié. Envoyez-le à votre partenaire.`,
    );
  }, [couple, copyText]);

  const handleShareInvite = useCallback(async () => {
    if (!couple) return;
    const url = `${window.location.origin}/?code=${couple.code}`;
    await shareOrCopy({
      title: "Rejoins-moi sur À deux",
      text: buildDuoInviteText(couple.code, url),
      url,
    });
  }, [couple, shareOrCopy]);

  const handleShareMatch = useCallback(
    async (idea: Idea) => {
      await shareOrCopy({
        title: idea.title,
        text: buildMatchShareText(idea),
        url: `${window.location.origin}/?duo=1`,
      });
    },
    [shareOrCopy],
  );

  const handleShareWish = useCallback(
    async (idea: Idea) => {
      await shareOrCopy({
        title: idea.title,
        text: buildIdeaShareText(idea),
        url: `${window.location.origin}/?duo=1`,
      });
    },
    [shareOrCopy],
  );

  const handleShareCelebration = useCallback(async () => {
    if (!activeCelebration?.shareText) return;
    await shareOrCopy({
      title: activeCelebration.title,
      text: activeCelebration.shareText,
      url: `${window.location.origin}/?duo=1`,
    });
  }, [activeCelebration, shareOrCopy]);

  const handleRemoveLiked = useCallback(
    async (idea: Idea) => {
      if (removingLikedId) return;
      setRemovingLikedId(idea.id);
      try {
        await api.removeSwipe(idea.id);
        setLiked((current) => current.filter((item) => item.id !== idea.id));
        setDecisions((current) =>
          current.filter((decision) => decision.ideaId !== idea.id),
        );
        showToast("Envie retirée de votre liste.", "success");
        void refreshCouple({ notify: false });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleSessionExpired();
          return;
        }
        showToast(
          errorMessage(error, "Impossible de retirer cette envie."),
          "error",
        );
      } finally {
        setRemovingLikedId(null);
      }
    },
    [handleSessionExpired, refreshCouple, removingLikedId, showToast],
  );

  const openPassed = useCallback(() => {
    setPassedOpen(true);
    setPassedLoading(true);
    setPassedError(null);
    api
      .listPassedIdeas()
      .then((result) => setPassedIdeas(result.passed))
      .catch((error) =>
        setPassedError(
          errorMessage(error, "Impossible de charger les idées passées."),
        ),
      )
      .finally(() => setPassedLoading(false));
  }, []);

  const handleForget = useCallback(async () => {
    setForgetting(true);
    try {
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
      setDraftPrefs(DEFAULT_PREFS);
      setStartError(null);
      setDuoDialogOpen(false);
      setDuoError(null);
      setCelebrationQueue([]);
      setActiveCelebration(null);
      setIncomingTap(null);
      setPassedOpen(false);
      setTab("decouvrir");
      showToast("Votre session et vos envies ont été effacées.", "success");
    } finally {
      setForgetting(false);
    }
  }, [resetCouple, resetSync, showToast]);

  const closeCelebration = useCallback(() => {
    setActiveCelebration(null);
    void markSeen();
  }, [markSeen]);

  const openDuoFromCelebration = useCallback(() => {
    const target = activeCelebration?.duoTab ?? "matches";
    setActiveCelebration(null);
    if (target === "matches") {
      setTab("deux");
      void markSeen();
      return;
    }
    setDuoError(null);
    setDuoInitialTab(target);
    setDuoDialogOpen(true);
  }, [activeCelebration, markSeen]);

  const openDuoDialog = useCallback((target: DuoDialogTab) => {
    setDuoError(null);
    setDuoInitialTab(target);
    setDuoDialogOpen(true);
  }, []);

  const handleTabChange = useCallback(
    (next: TabId) => {
      setTab(next);
      setFiltersOpen(false);
      setPassedOpen(false);
      if (next === "deux" && couple && couple.unread > 0) {
        void markSeen();
      }
    },
    [couple, markSeen],
  );

  const builderOptions = useMemo<BuilderOptions>(() => {
    if (couple?.complete) {
      const find = (id: string) => CHOICES_BY_ID.get(id);
      return {
        activity: couple.matches.map((match) => match.idea),
        food: couple.choiceMatches
          .filter((match) => match.category === "food")
          .map((match) => find(match.choiceId))
          .filter((choice): choice is Choice => Boolean(choice)),
        movie: couple.choiceMatches
          .filter((match) => match.category === "movie")
          .map((match) => find(match.choiceId))
          .filter((choice): choice is Choice => Boolean(choice)),
      };
    }
    return { activity: liked, food: [], movie: [] };
  }, [couple, liked]);

  const openBuilder = useCallback((prefill: BuilderPrefill = null) => {
    setBuilderPrefill(prefill);
    setBuilderOpen(true);
  }, []);

  const handleAddCelebration = useCallback(() => {
    if (!activeCelebration) return;
    const prefill = activeCelebration.builder ?? null;
    setActiveCelebration(null);
    void markSeen();
    void refreshCouple({ notify: false });
    openBuilder(prefill);
  }, [activeCelebration, markSeen, openBuilder, refreshCouple]);

  const headerAction =
    tab === "decouvrir" ? (
      universe === "activity" ? (
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={
            activeFilters > 0
              ? `Filtres, ${activeFilters} critère${activeFilters > 1 ? "s" : ""} actif${activeFilters > 1 ? "s" : ""}`
              : "Filtres"
          }
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold/25 bg-ink-800/60 px-3 py-1.5 text-[11.5px] font-medium text-cream/75 transition hover:border-gold/45 hover:text-cream"
        >
          <SlidersIcon className="h-3.5 w-3.5 text-gold/80" />
          Filtres
          {activeFilters > 0 ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9.5px] font-bold leading-none text-[#17110a]">
              {activeFilters}
            </span>
          ) : null}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setChoiceFiltersOpen(true)}
          aria-label={
            choiceFilter
              ? `Filtres, ${choiceFilter} sélectionné`
              : "Filtres"
          }
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold/25 bg-ink-800/60 px-3 py-1.5 text-[11.5px] font-medium text-cream/75 transition hover:border-gold/45 hover:text-cream"
        >
          <SlidersIcon className="h-3.5 w-3.5 text-gold/80" />
          Filtres
          {choiceFilter ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9.5px] font-bold leading-none text-[#17110a]">
              1
            </span>
          ) : null}
        </button>
      )
    ) : undefined;

  return (
    <MotionConfig reducedMotion="user">
      <AppShell
        tab={tab}
        onTabChange={handleTabChange}
        unread={(couple?.unread ?? 0) + (couple?.choiceUnread ?? 0)}
        action={headerAction}
        status={{
          label: couple
            ? couple.complete
              ? "Duo connecté"
              : "Invitation en attente"
            : "Inviter ma moitié",
          complete: couple?.complete === true,
          onClick: () => setTab("deux"),
        }}
      >
        {tab === "decouvrir" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 px-4 pt-2.5">
              <UniverseSwitch
                value={universe}
                onChange={(next) => {
                  setUniverse(next);
                  setChoiceFilter(null);
                  setChoiceFiltersOpen(false);
                }}
              />
            </div>
            <div className="min-h-0 flex-1">
              {universe === "activity" ? (
                <DiscoverView
                  ideas={session?.ideas ?? []}
                  index={index}
                  total={session?.total ?? 0}
                  swiped={swiped}
                  likedCount={likedCount}
                  hasSession={Boolean(session)}
                  canUndo={
                    decisions.length > 0 &&
                    pending === 0 &&
                    !offline &&
                    !undoBusy
                  }
                  undoBusy={undoBusy}
                  pending={pending}
                  offline={offline}
                  syncError={syncError}
                  onDecide={handleDecide}
                  onUndo={() => void handleUndo()}
                  onRetrySync={retrySync}
                  onOpenFilters={() => setFiltersOpen(true)}
                  onOpenPassed={openPassed}
                  onOpenWishlist={() => setTab("envies")}
                />
              ) : (
                <ChoicesDiscover
                  category={universe}
                  complete={couple?.complete === true}
                  snapshot={filteredChoices}
                  loading={choices.loading}
                  error={choices.error}
                  pending={choices.pending}
                  onSwipe={(choice, direction) =>
                    void choices.swipe(choice, direction)
                  }
                  onRefresh={() => void choices.refresh()}
                  onGoDuo={() => setTab("deux")}
                />
              )}
            </div>
          </div>
        ) : null}

        {tab === "deux" ? (
          <DuoTab
            couple={couple}
            hasSession={Boolean(session)}
            busy={duoBusy}
            error={duoError}
            onSendTap={handleSendTap}
            onTapError={(message) => showToast(message, "error")}
            onCreate={() => void handleCreateDuo()}
            onJoin={(code) => void handleJoinDuo(code)}
            onDissolve={() => void handleDissolveDuo()}
            onShareInvite={() => void handleShareInvite()}
            onCopyCode={() => void handleCopyDuoCode()}
            onShareMatch={(idea) => void handleShareMatch(idea)}
            onOpenMatch={(idea) => {
              setDetailSource("match");
              setDetailIdea(idea);
            }}
            onOpenSouvenirs={() => openDuoDialog("souvenirs")}
            onOpenChoices={() => openDuoDialog("choices")}
            onDiscover={() => setTab("decouvrir")}
            onOpenBuilder={() => openBuilder()}
          />
        ) : null}

        {tab === "envies" ? (
          <WishlistView
            likedIdeas={liked}
            total={session?.total ?? 0}
            hasSession={Boolean(session)}
            removingId={removingLikedId}
            onCopy={() => void handleCopyWishlist()}
            onRemove={(idea) => void handleRemoveLiked(idea)}
            onOpenDetail={(idea) => {
              setDetailSource("envie");
              setDetailIdea(idea);
            }}
            onOpenBuilder={() => openBuilder()}
            onDiscover={() => setTab("decouvrir")}
            onOpenFilters={() => setFiltersOpen(true)}
          />
        ) : null}

        {tab === "profil" ? (
          <ProfileView
            account={account}
            authProviders={authProviders}
            hasSession={Boolean(session)}
            couple={couple}
            forgetting={forgetting}
            onForget={handleForget}
          />
        ) : null}
      </AppShell>

      <FiltersSheet
        open={filtersOpen}
        initialPrefs={session?.prefs ?? draftPrefs}
        hasSession={Boolean(session)}
        busy={starting}
        error={startError}
        onClose={() => setFiltersOpen(false)}
        onSubmit={(prefs) => void handleApplyFilters(prefs)}
      />

      <PassedSheet
        open={passedOpen}
        loading={passedLoading}
        ideas={passedIdeas}
        error={passedError}
        onClose={() => setPassedOpen(false)}
        onOpenFilters={() => {
          setPassedOpen(false);
          setFiltersOpen(true);
        }}
      />

      <DuoDialog
        open={duoDialogOpen}
        couple={couple}
        busy={duoBusy}
        error={duoError}
        initialTab={duoInitialTab}
        onChoiceMatch={handleChoiceMatch}
        onTabChange={() => undefined}
        soundEnabled={tapSoundEnabled}
        onToggleSound={() => setTapSoundEnabled(!tapSoundEnabled)}
        onClose={() => {
          setDuoDialogOpen(false);
          setDuoError(null);
        }}
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
        onLeave={handleDissolveDuo}
        onCopyCode={() => void handleCopyDuoCode()}
        onMarkSeen={() => void markSeen()}
      />

      <ChoiceFiltersSheet
        open={choiceFiltersOpen}
        category={universe === "food" ? "food" : "movie"}
        selected={choiceFilter}
        onSelect={setChoiceFilter}
        onClose={() => setChoiceFiltersOpen(false)}
      />

      <DateBuilderSheet
        open={builderOpen}
        duo={couple?.complete === true}
        options={builderOptions}
        prefill={builderPrefill}
        onClose={() => {
          setBuilderOpen(false);
          setBuilderPrefill(null);
        }}
        onToast={(message, tone) => showToast(message, tone ?? "info")}
      />

      <IdeaDetailSheet
        idea={detailIdea}
        shareLabel={
          detailSource === "match"
            ? "Proposer ce rendez-vous"
            : "Partager cette envie"
        }
        onClose={() => setDetailIdea(null)}
        onShare={(idea) =>
          void (detailSource === "match"
            ? handleShareMatch(idea)
            : handleShareWish(idea))
        }
      />

      <AnimatePresence>
        {activeCelebration ? (
          <MatchCelebration
            key={activeCelebration.id}
            data={activeCelebration}
            onClose={closeCelebration}
            onOpenDuo={openDuoFromCelebration}
            onShare={
              activeCelebration.shareText
                ? () => void handleShareCelebration()
                : undefined
            }
            onAddToSoiree={
              activeCelebration.builder ? handleAddCelebration : undefined
            }
          />
        ) : null}
      </AnimatePresence>

      {incomingTap ? <TapPulse onDone={clearIncomingTap} /> : null}

      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.3, 0.8, 0.2, 1] }}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`fixed inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-[70] mx-auto flex w-[calc(100%-2rem)] max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
              toast.tone === "success"
                ? "border-gold/35 bg-[#171208]/95 text-gold"
                : toast.tone === "error"
                  ? "border-rose/40 bg-[#1c0b10]/95 text-rose-soft"
                  : "border-gold/20 bg-ink-850/95 text-cream/80"
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
              className="-my-1.5 -mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg opacity-70 transition hover:bg-gold/10 hover:opacity-100"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}

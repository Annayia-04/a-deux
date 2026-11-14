import type {
  Choice,
  ChoiceCategory,
  ChoiceSnapshot,
  CoupleSnapshot,
  Idea,
  Prefs,
  SessionSnapshot,
  SouvenirSnapshot,
  SwipeDirection,
  TapSnapshot,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;

  let response: Response;
  try {
    response = await fetch(path, {
      method: init.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(hasBody ? { "content-type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Connexion impossible. Vérifiez votre réseau.", 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Une erreur est survenue.";
    const retryAfter = Number(response.headers.get("retry-after") ?? "");
    throw new ApiError(
      message,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }

  return payload as T;
}

export const api = {
  createSession(prefs: Prefs): Promise<SessionSnapshot> {
    return request<SessionSnapshot>("/api/session", {
      method: "POST",
      body: { prefs },
    });
  },

  deleteSession(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/api/session", { method: "DELETE" });
  },

  preview(
    prefs: Prefs,
    signal?: AbortSignal,
  ): Promise<{ count: number }> {
    return request<{ count: number }>("/api/preview", {
      method: "POST",
      body: { prefs },
      signal,
    });
  },

  swipe(
    ideaId: string,
    direction: SwipeDirection,
  ): Promise<{ ok: boolean; swiped: number; match?: Idea }> {
    return request<{ ok: boolean; swiped: number; match?: Idea }>(
      "/api/swipes",
      {
        method: "POST",
        body: { ideaId, direction },
      },
    );
  },

  undo(): Promise<{ ok: boolean; ideaId: string }> {
    return request<{ ok: boolean; ideaId: string }>("/api/swipes/undo", {
      method: "POST",
    });
  },

  getCouple(signal?: AbortSignal): Promise<{ couple: CoupleSnapshot | null }> {
    return request<{ couple: CoupleSnapshot | null }>("/api/couple", { signal });
  },

  createCouple(): Promise<{ couple: CoupleSnapshot }> {
    return request<{ couple: CoupleSnapshot }>("/api/couple", {
      method: "POST",
    });
  },

  joinCouple(code: string): Promise<{ couple: CoupleSnapshot }> {
    return request<{ couple: CoupleSnapshot }>("/api/couple/join", {
      method: "POST",
      body: { code },
    });
  },

  leaveCouple(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/api/couple", { method: "DELETE" });
  },

  markCoupleSeen(): Promise<{ couple: CoupleSnapshot }> {
    return request<{ couple: CoupleSnapshot }>("/api/couple/seen", {
      method: "POST",
    });
  },

  getSouvenirs(signal?: AbortSignal): Promise<{ souvenirs: SouvenirSnapshot[] }> {
    return request<{ souvenirs: SouvenirSnapshot[] }>("/api/souvenirs", {
      signal,
    });
  },

  createSouvenir(
    input: SouvenirDraft,
  ): Promise<{ souvenir: SouvenirSnapshot }> {
    return request<{ souvenir: SouvenirSnapshot }>("/api/souvenirs", {
      method: "POST",
      body: input,
    });
  },

  saveSouvenirNote(
    id: string,
    body: string,
  ): Promise<{ souvenir: SouvenirSnapshot }> {
    return request<{ souvenir: SouvenirSnapshot }>(
      `/api/souvenirs/${encodeURIComponent(id)}/note`,
      { method: "PUT", body: { body } },
    );
  },

  getChoices(
    category: ChoiceCategory,
    signal?: AbortSignal,
  ): Promise<ChoiceSnapshot> {
    return request<ChoiceSnapshot>(
      `/api/choices?category=${encodeURIComponent(category)}`,
      { signal },
    );
  },

  swipeChoice(
    category: ChoiceCategory,
    choiceId: string,
    direction: SwipeDirection,
  ): Promise<{ ok: boolean; match: Choice | null }> {
    return request<{ ok: boolean; match: Choice | null }>(
      "/api/choices/swipe",
      {
        method: "POST",
        body: { category, choiceId, direction },
      },
    );
  },

  markChoicesSeen(
    category: ChoiceCategory,
  ): Promise<{ ok: boolean; unread: number }> {
    return request<{ ok: boolean; unread: number }>("/api/choices/seen", {
      method: "POST",
      body: { category },
    });
  },

  getTaps(
    signal?: AbortSignal,
  ): Promise<{ tap: TapSnapshot | null; unread: number }> {
    return request<{ tap: TapSnapshot | null; unread: number }>("/api/taps", {
      signal,
    });
  },

  sendTap(): Promise<{ tap: TapSnapshot }> {
    return request<{ tap: TapSnapshot }>("/api/taps", { method: "POST" });
  },

  markTapSeen(tapId: number): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/api/taps/seen", {
      method: "POST",
      body: { tapId },
    });
  },

  /** Associe ce téléphone au widget natif « Petit ping ». */
  pairWidget(label?: string): Promise<{ token: string }> {
    return request<{ token: string }>("/api/widget/devices", {
      method: "POST",
      body: label ? { label } : {},
    });
  },

  async uploadSouvenirPhotos(
    souvenirId: string,
    files: File[],
  ): Promise<SouvenirSnapshot> {
    const body = new FormData();
    for (const file of files) body.append("photos", file);

    let response: Response;
    try {
      response = await fetch(`/api/souvenirs/${souvenirId}/photos`, {
        method: "POST",
        body,
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      throw new ApiError("Connexion impossible. Vérifiez votre réseau.", 0);
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload !== null &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "Impossible d’ajouter ces photos.";
      throw new ApiError(message, response.status);
    }

    return (payload as { souvenir: SouvenirSnapshot }).souvenir;
  },

  deleteSouvenirPhoto(
    photoId: string,
  ): Promise<{ souvenir: SouvenirSnapshot }> {
    return request<{ souvenir: SouvenirSnapshot }>(
      `/api/souvenirs/photos/${photoId}`,
      { method: "DELETE" },
    );
  },

  revokeWidget(token: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/api/widget/devices", {
      method: "DELETE",
      body: { token },
    });
  },

  /**
   * Vérifie un jeton d'appareil sans envoyer de ping.
   * `"unknown"` couvre les pannes réseau : on conserve alors le jeton.
   */
  async verifyWidgetToken(
    token: string,
  ): Promise<"valid" | "invalid" | "unknown"> {
    try {
      const response = await fetch("/api/widget/devices/status", {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
        },
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.ok) return "valid";
      if (response.status === 401) return "invalid";
      return "unknown";
    } catch {
      return "unknown";
    }
  },
};

export type SouvenirDraft = {
  ideaId?: string;
  title?: string;
  emoji?: string;
  happenedAt?: number;
  body?: string;
};

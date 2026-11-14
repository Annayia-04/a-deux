"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import type { SouvenirSnapshot } from "@/lib/types";

function formatDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function monthKey(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return "Souvenirs";
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type AlbumItem = {
  id: string;
  createdAt: number;
  mine: boolean;
  souvenir: SouvenirSnapshot;
};

type Props = {
  souvenirs: SouvenirSnapshot[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEditMine: (souvenir: SouvenirSnapshot) => void;
  onDeletePhoto: (photoId: string) => Promise<void>;
};

export function SouvenirTimeline({
  souvenirs,
  loading,
  error,
  onAdd,
  onEditMine,
  onDeletePhoto,
}: Props) {
  const [view, setView] = useState<"journal" | "album">("journal");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const groups = new Map<string, SouvenirSnapshot[]>();
  for (const souvenir of souvenirs) {
    const key = monthKey(souvenir.happenedAt);
    const group = groups.get(key) ?? [];
    group.push(souvenir);
    groups.set(key, group);
  }

  const album = useMemo<AlbumItem[]>(() => {
    const items = souvenirs.flatMap((souvenir) =>
      souvenir.photos.map((photo) => ({
        id: photo.id,
        createdAt: photo.createdAt,
        mine: photo.mine,
        souvenir,
      })),
    );
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }, [souvenirs]);

  const photosCount = album.length;
  const current = lightboxIndex !== null ? album[lightboxIndex] : null;

  useEffect(() => {
    if (!current) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") {
        setLightboxIndex((index) =>
          index === null ? null : Math.max(0, index - 1),
        );
      }
      if (event.key === "ArrowRight") {
        setLightboxIndex((index) =>
          index === null ? null : Math.min(album.length - 1, index + 1),
        );
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [current, album.length]);

  useEffect(() => {
    if (!current) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [current]);

  useEffect(() => {
    setConfirmDeleteId(null);
    setPhotoError(null);
  }, [lightboxIndex]);

  function openPhoto(photoId: string) {
    const index = album.findIndex((item) => item.id === photoId);
    if (index >= 0) setLightboxIndex(index);
  }

  async function removeCurrentPhoto() {
    if (!current) return;
    setDeleting(true);
    setPhotoError(null);
    try {
      await onDeletePhoto(current.id);
      setLightboxIndex((index) => {
        if (index === null) return null;
        if (album.length <= 1) return null;
        return Math.min(index, album.length - 2);
      });
      setConfirmDeleteId(null);
    } catch (caught) {
      setPhotoError(
        caught instanceof Error
          ? caught.message
          : "Impossible de retirer cette photo.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-[22px] leading-none tracking-[0.01em] text-cream">
            Votre journal
          </h3>
          <span aria-hidden className="rule-ornament mt-2 block h-px w-24" />
          <p className="mt-1.5 text-[10.5px] text-ash">
            {souvenirs.length > 0
              ? `${souvenirs.length} date${souvenirs.length > 1 ? "s" : ""} racontée${souvenirs.length > 1 ? "s" : ""} · ${photosCount} photo${photosCount > 1 ? "s" : ""}`
              : "Les dates vécues, racontées à deux."}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/[0.06] px-3 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/65 hover:bg-gold/10"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      <div className="flex gap-1 rounded-xl border border-gold/20 bg-ink-800/50 p-1">
        <button
          type="button"
          onClick={() => setView("journal")}
          aria-pressed={view === "journal"}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-medium transition ${
            view === "journal"
              ? "bg-gold/[0.1] text-cream shadow-[inset_0_-1px_0_rgba(197,160,89,0.65)]"
              : "text-cream/45 hover:text-cream/75"
          }`}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          Journal
        </button>
        <button
          type="button"
          onClick={() => setView("album")}
          aria-pressed={view === "album"}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-medium transition ${
            view === "album"
              ? "bg-gold/[0.1] text-cream shadow-[inset_0_-1px_0_rgba(197,160,89,0.65)]"
              : "text-cream/45 hover:text-cream/75"
          }`}
        >
          <CameraIcon className="h-3.5 w-3.5" />
          Album
          {photosCount > 0 ? (
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold leading-none text-cream ring-1 ring-gold/40">
              {photosCount > 99 ? "99+" : photosCount}
            </span>
          ) : null}
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11.5px] leading-relaxed text-rose-soft"
        >
          {error}
        </p>
      ) : null}

      {loading && souvenirs.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1].map((index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-gold/15 bg-ink-850/70"
            />
          ))}
        </div>
      ) : null}

      {!loading && souvenirs.length === 0 ? (
        <div className="grimoire ornament-corners rounded-2xl px-5 py-9 text-center">
          <span aria-hidden className="text-4xl">
            📖
          </span>
          <p className="mt-3 font-display text-[18px] text-cream">
            Votre histoire commence ici
          </p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-ash">
            Après un date, racontez chacun votre moment préféré et ajoutez vos
            photos. Les deux versions se retrouvent dans cet album.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[12px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Écrire un premier souvenir
          </button>
        </div>
      ) : null}

      {view === "album" && souvenirs.length > 0 ? (
        photosCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/20 bg-ink-850/60 px-5 py-8 text-center">
            <CameraIcon className="mx-auto h-6 w-6 text-gold/70" />
            <p className="mt-3 font-display text-[17px] text-cream">
              Aucune photo pour l’instant
            </p>
            <p className="mx-auto mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-ash">
              Ouvrez un souvenir et ajoutez vos photos : elles apparaîtront ici,
              dans l’album de votre duo.
            </p>
            <button
              type="button"
              onClick={() => setView("journal")}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.06] px-3 py-2 text-[11.5px] font-medium text-gold transition hover:border-gold/55"
            >
              Revenir au journal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {album.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gold/20 bg-ink-950/60"
                aria-label={`Photo de ${photo.souvenir.title}, ${formatDate(photo.souvenir.happenedAt)}`}
              >
                <img
                  src={`/api/souvenirs/photos/${photo.id}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100"
                />
              </button>
            ))}
          </div>
        )
      ) : null}

      {view === "journal"
        ? [...groups.entries()].map(([month, items]) => (
            <div key={month}>
              <p className="mb-2 flex items-center gap-2 font-display text-[13px] tracking-[0.08em] text-gold/85">
                <span className="h-1.5 w-1.5 rotate-45 bg-gold/80" />
                {capitalize(month)}
              </p>
              <div className="relative space-y-2.5 border-l border-gold/20 pl-3.5">
                {items.map((souvenir, index) => (
                  <motion.article
                    key={souvenir.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(index * 0.04, 0.2),
                      ease: [0.3, 0.8, 0.2, 1],
                    }}
                    className="grimoire relative rounded-2xl p-3.5"
                  >
                    <span
                      aria-hidden
                      className="absolute -left-[22px] top-5 h-2.5 w-2.5 rotate-45 border border-gold/60 bg-ember"
                    />

                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose/30 to-gold/15 text-[20px] ring-1 ring-gold/25"
                      >
                        {souvenir.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-display text-[16px] leading-tight text-cream">
                            {souvenir.title}
                          </h4>
                          {souvenir.complete ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/10 px-1.5 py-0.5 text-[9px] font-medium text-gold ring-1 ring-inset ring-gold/30">
                              <CheckIcon className="h-2.5 w-2.5" />
                              2/2
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-ink-800/80 px-1.5 py-0.5 text-[9px] text-ash">
                              {Number(souvenir.mine !== null) +
                                Number(souvenir.partner !== null)}
                              /2
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-ash">
                          {formatDate(souvenir.happenedAt)}
                        </p>
                      </div>
                    </div>

                    {souvenir.photos.length > 0 ? (
                      <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
                        {souvenir.photos.slice(0, 4).map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => openPhoto(photo.id)}
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gold/20 bg-ink-950/60"
                            aria-label={`Voir une photo de ${souvenir.title}`}
                          >
                            <img
                              src={`/api/souvenirs/photos/${photo.id}`}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                        {souvenir.photos.length > 4 ? (
                          <button
                            type="button"
                            onClick={() => setView("album")}
                            className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-gold/20 bg-ink-800/60 text-[10.5px] text-gold"
                          >
                            +{souvenir.photos.length - 4}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-rose/15 bg-rose/[0.05] px-2.5 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-soft/85">
                          Votre moment
                        </p>
                        {souvenir.mine ? (
                          <>
                            <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-cream/80">
                              {souvenir.mine}
                            </p>
                            <button
                              type="button"
                              onClick={() => onEditMine(souvenir)}
                              className="mt-1.5 text-[10px] text-ash underline-offset-2 transition hover:text-cream/70 hover:underline"
                            >
                              Modifier
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onEditMine(souvenir)}
                            className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-dashed border-rose/35 bg-rose/[0.06] px-2 py-1 text-[10.5px] font-medium text-rose-soft transition hover:border-rose/55 hover:bg-rose/10"
                          >
                            <SparklesIcon className="h-3 w-3" />
                            Écrire votre moment
                          </button>
                        )}
                      </div>

                      <div className="rounded-xl border border-gold/12 bg-ink-800/50 px-2.5 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ash">
                          Votre partenaire
                        </p>
                        {souvenir.partner ? (
                          <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-cream/65">
                            {souvenir.partner}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] italic text-ash">
                            En attente de son moment…
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          ))
        : null}

      {current ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/92 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo de ${current.souvenir.title}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxIndex(null);
          }}
        >
          <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[26px] border border-gold/25 bg-ink-900 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)]">
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-ink-950">
              <img
                src={`/api/souvenirs/photos/${current.id}`}
                alt={`Photo de ${current.souvenir.title}`}
                className="max-h-[64dvh] w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Fermer la photo"
                className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border border-gold/30 bg-ink-950/80 text-cream/80 backdrop-blur"
              >
                <XIcon className="h-4 w-4" />
              </button>

              {album.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((index) =>
                        index === null ? null : Math.max(0, index - 1),
                      )
                    }
                    disabled={lightboxIndex === 0}
                    aria-label="Photo précédente"
                    className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-gold/25 bg-ink-950/80 text-cream/80 backdrop-blur disabled:opacity-30"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((index) =>
                        index === null
                          ? null
                          : Math.min(album.length - 1, index + 1),
                      )
                    }
                    disabled={lightboxIndex === album.length - 1}
                    aria-label="Photo suivante"
                    className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-gold/25 bg-ink-950/80 text-cream/80 backdrop-blur disabled:opacity-30"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-display text-[16px] text-cream">
                  {current.souvenir.title}
                </p>
                <p className="text-[10.5px] text-ash">
                  {formatDate(current.souvenir.happenedAt)}
                </p>
              </div>
              {current.mine ? (
                confirmDeleteId === current.id ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void removeCurrentPhoto()}
                      disabled={deleting}
                      className="min-h-11 rounded-lg border border-gold/40 bg-rose px-3 text-[11px] font-semibold text-cream disabled:opacity-50"
                    >
                      {deleting ? "…" : "Retirer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-11 rounded-lg px-2 text-[11px] text-cream/60"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(current.id)}
                    className="min-h-11 shrink-0 rounded-lg border border-gold/25 bg-gold/[0.06] px-3 text-[11px] text-gold transition hover:border-gold/50"
                  >
                    Retirer
                  </button>
                )
              ) : null}
            </div>
            {photoError ? (
              <p
                role="alert"
                className="border-t border-gold/12 px-4 py-2 text-[11px] text-rose-soft"
              >
                {photoError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

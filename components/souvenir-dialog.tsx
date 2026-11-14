"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertIcon,
  CameraIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import type { SouvenirDraft } from "@/lib/api-client";
import { compressPhotos } from "@/lib/images-client";
import type { SouvenirSnapshot } from "@/lib/types";

const EMOJIS = ["✨", "🕯️", "🥀", "🍽️", "🎬", "🌙"];
const MAX_BODY = 500;
const MAX_PHOTOS = 8;

function toDateInput(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export type SouvenirPrefill = {
  ideaId?: string;
  title?: string;
  emoji?: string;
};

type Props = {
  open: boolean;
  mode: "create" | "note";
  souvenir: SouvenirSnapshot | null;
  prefill: SouvenirPrefill | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (input: SouvenirDraft, photos: File[]) => Promise<void>;
  onSaveNote: (id: string, body: string, photos: File[]) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
};

function PhotoPicker({
  existing,
  files,
  total,
  busy,
  preparing,
  error,
  confirmDeleteId,
  deletingId,
  onFiles,
  onRemoveFile,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  existing: SouvenirSnapshot["photos"];
  files: File[];
  total: number;
  busy: boolean;
  preparing: boolean;
  error: string | null;
  confirmDeleteId: string | null;
  deletingId: string | null;
  onFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onAskDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDelete: (id: string) => void;
}) {
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url);
    },
    [previews],
  );

  const remaining = MAX_PHOTOS - total;

  return (
    <section className="mt-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold/70">
          Photos
        </p>
        <span className="text-[10px] text-ash">
          {total} / {MAX_PHOTOS}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {existing.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-gold/20 bg-ink-950/60"
          >
            <img
              src={`/api/souvenirs/photos/${photo.id}`}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {photo.mine ? (
              <button
                type="button"
                onClick={() => onAskDelete(photo.id)}
                aria-label="Retirer cette photo"
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-gold/30 bg-ink-950/80 text-cream/80 transition hover:text-cream"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}

            {confirmDeleteId === photo.id ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink-950/90 px-1 text-center">
                <p className="text-[9px] leading-tight text-cream/80">
                  Retirer ?
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onDelete(photo.id)}
                    disabled={deletingId === photo.id}
                    className="rounded-md bg-rose px-1.5 py-0.5 text-[9px] font-semibold text-cream disabled:opacity-50"
                  >
                    {deletingId === photo.id ? "…" : "Oui"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="rounded-md border border-gold/20 px-1.5 py-0.5 text-[9px] text-cream/60"
                  >
                    Non
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {previews.map((preview, index) => (
          <div
            key={`${preview.file.name}-${index}`}
            className="relative aspect-square overflow-hidden rounded-xl border border-gold/20 bg-ink-950/60"
          >
            <img
              src={preview.url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemoveFile(index)}
              aria-label="Retirer cette photo"
              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-gold/30 bg-ink-950/80 text-cream/80 transition hover:text-cream"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {remaining > 0 ? (
          <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-gold/30 bg-gold/[0.04] text-gold transition hover:border-gold/55 hover:bg-gold/[0.08]">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={busy || preparing}
              onChange={(event) => {
                // Copier la liste AVANT de vider l'input : FileList est vivant
                // et serait vidé par `value = ""`.
                const selected = event.target.files
                  ? Array.from(event.target.files)
                  : [];
                event.target.value = "";
                onFiles(selected);
              }}
            />
            <CameraIcon className="h-5 w-5" />
            <span className="mt-0.5 text-[9px]">Ajouter</span>
          </label>
        ) : null}
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-ash">
        JPEG compressé, 1600 px max · visible uniquement par vous deux.
      </p>

      {preparing ? (
        <p role="status" className="mt-1 text-[10.5px] text-gold">
          Préparation des photos…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-[10.5px] text-rose-soft">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function SouvenirDialog({
  open,
  mode,
  souvenir,
  prefill,
  busy,
  error,
  onClose,
  onCreate,
  onSaveNote,
  onDeletePhoto,
}: Props) {
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setPhotoError(null);
    setPhotoFiles([]);
    setConfirmDeleteId(null);
    setBody(mode === "note" ? (souvenir?.mine ?? "") : "");
    setTitle(prefill?.title ?? "");
    setEmoji(prefill?.emoji ?? "✨");
    setDate(toDateInput(Date.now()));
  }, [open, mode, prefill, souvenir]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, onClose]);

  const trimmedBody = body.trim();
  const remaining = MAX_BODY - body.length;
  const usingIdea = Boolean(prefill?.ideaId);
  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (mode === "note") {
      if (trimmedBody.length > MAX_BODY) return false;
      return trimmedBody.length >= 1 || photoFiles.length > 0;
    }
    if (!usingIdea && title.trim().length < 2) return false;
    return trimmedBody.length <= MAX_BODY;
  }, [busy, mode, trimmedBody, title, usingIdea, photoFiles.length]);

  if (!open) return null;

  const existingPhotos = souvenir?.photos ?? [];
  const totalPhotos = existingPhotos.length + photoFiles.length;

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const available = MAX_PHOTOS - totalPhotos;
    if (available <= 0) {
      setPhotoError(`Ce souvenir contient déjà ${MAX_PHOTOS} photos.`);
      return;
    }
    const selected = files.slice(0, Math.min(available, 6));
    setPreparing(true);
    setPhotoError(null);
    try {
      const prepared = await compressPhotos(selected);
      setPhotoFiles((current) => [...current, ...prepared]);
    } catch (caught) {
      setPhotoError(
        caught instanceof Error
          ? caught.message
          : "Impossible de préparer ces photos.",
      );
    } finally {
      setPreparing(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setDeletingId(photoId);
    try {
      await onDeletePhoto(photoId);
      setConfirmDeleteId(null);
    } catch (caught) {
      setPhotoError(
        caught instanceof Error ? caught.message : "Impossible de retirer cette photo.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLocalError(null);

    if (mode === "note") {
      if (!souvenir) return;
      if (trimmedBody.length === 0) {
        setLocalError("Écrivez au moins quelques mots.");
        return;
      }
      await onSaveNote(souvenir.id, trimmedBody, photoFiles);
      return;
    }

    const happenedAt = fromDateInput(date);
    if (happenedAt === null) {
      setLocalError("Choisissez une date valide.");
      return;
    }

    await onCreate(
      {
        ...(prefill?.ideaId
          ? { ideaId: prefill.ideaId }
          : { title: title.trim(), emoji }),
        happenedAt,
        ...(trimmedBody.length > 0 ? { body: trimmedBody } : {}),
      },
      photoFiles,
    );
  }

  const shownError = localError ?? error;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/85 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "note" ? "Votre moment préféré" : "Nouveau souvenir"
        }
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-gold/25 bg-ink-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] sm:max-h-[85vh] sm:max-h-[85dvh] sm:rounded-[28px]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gold/12 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/85">
              <SparklesIcon className="h-3 w-3" />
              Journal de souvenirs
            </p>
            <h2 className="mt-1 font-display text-[23px] leading-tight text-cream">
              {mode === "note" ? "Votre moment préféré" : "Un nouveau souvenir"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/20 bg-ink-800/70 text-cream/60 transition hover:border-gold/40 hover:text-cream disabled:opacity-40"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {shownError ? (
            <p
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-[11.5px] leading-relaxed text-rose-soft"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {shownError}
            </p>
          ) : null}

          {mode === "note" && souvenir ? (
            <div className="grimoire mb-4 flex items-center gap-3 rounded-2xl p-3">
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose/30 to-gold/15 text-[20px] ring-1 ring-gold/25"
              >
                {souvenir.emoji}
              </span>
              <div className="min-w-0">
                <p className="font-display text-[16px] text-cream">
                  {souvenir.title}
                </p>
                <p className="text-[10px] text-ash">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(souvenir.happenedAt))}
                </p>
              </div>
            </div>
          ) : null}

          {mode === "create" ? (
            <>
              {usingIdea ? (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-gold/25 bg-rose/[0.1] p-3">
                  <span aria-hidden className="text-[26px]">
                    {prefill?.emoji ?? "✨"}
                  </span>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gold/80">
                      Depuis votre match
                    </p>
                    <p className="font-display text-[16px] text-cream">
                      {prefill?.title}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="souvenir-title"
                    className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold/70"
                  >
                    Le date
                  </label>
                  <input
                    id="souvenir-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                    autoFocus
                    placeholder="Ex. Dîner sur les quais"
                    className="mt-2 w-full rounded-xl border border-gold/25 bg-ink-950/70 px-3 py-2.5 text-[13px] text-cream placeholder:text-cream/25 focus:border-gold/60 focus:outline-none"
                  />

                  <div className="mt-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold/70">
                      Ambiance
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {EMOJIS.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setEmoji(choice)}
                          aria-label={`Choisir l’emoji ${choice}`}
                          aria-pressed={emoji === choice}
                          className={`grid h-9 w-9 place-items-center rounded-xl border text-[17px] transition ${
                            emoji === choice
                              ? "border-gold/60 bg-rose/20"
                              : "border-gold/15 bg-ink-800/60 hover:border-gold/35"
                          }`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <label
                htmlFor="souvenir-date"
                className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold/70"
              >
                Quand ?
              </label>
              <input
                id="souvenir-date"
                type="date"
                value={date}
                max={toDateInput(Date.now())}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gold/25 bg-ink-950/70 px-3 py-2.5 text-[13px] text-cream [color-scheme:dark] focus:border-gold/60 focus:outline-none"
              />
            </>
          ) : null}

          <label
            htmlFor="souvenir-body"
            className="mt-4 block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold/70"
          >
            {mode === "note"
              ? "Ce que vous avez préféré"
              : "Votre moment préféré (facultatif)"}
          </label>
          <textarea
            id="souvenir-body"
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY))}
            rows={4}
            autoFocus={mode === "note"}
            placeholder="Un détail, une phrase, une sensation…"
            className="mt-2 w-full resize-none rounded-xl border border-gold/25 bg-ink-950/70 px-3 py-2.5 text-[13px] leading-relaxed text-cream placeholder:text-cream/25 focus:border-gold/60 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between text-[10px] text-ash">
            <span>Texte brut · visible uniquement par vous deux</span>
            <span className={remaining < 40 ? "text-gold" : undefined}>
              {body.length} / {MAX_BODY}
            </span>
          </div>

          <PhotoPicker
            existing={existingPhotos}
            files={photoFiles}
            total={totalPhotos}
            busy={busy}
            preparing={preparing}
            error={photoError}
            confirmDeleteId={confirmDeleteId}
            deletingId={deletingId}
            onFiles={(files) => void handleFiles(files)}
            onRemoveFile={(index) =>
              setPhotoFiles((current) =>
                current.filter((_, itemIndex) => itemIndex !== index),
              )
            }
            onAskDelete={(id) => setConfirmDeleteId(id)}
            onCancelDelete={() => setConfirmDeleteId(null)}
            onDelete={(id) => void handleDeletePhoto(id)}
          />
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gold/12 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl px-3.5 py-2 text-[12px] text-cream/55 transition hover:bg-gold/5 hover:text-cream disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || preparing}
            className="rounded-xl border border-gold/45 bg-gradient-to-r from-ember to-rose px-4 py-2.5 text-[12.5px] font-semibold text-cream transition hover:border-gold/70 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Enregistrement…"
              : mode === "note"
                ? "Enregistrer mon moment"
                : "Créer le souvenir"}
          </button>
        </footer>
      </div>
    </div>
  );
}

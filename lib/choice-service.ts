import "server-only";

import {
  requireCompleteCouple,
  requireCoupleMembership,
} from "@/lib/couple";
import {
  CHOICES_BY_CATEGORY,
  CHOICES_BY_ID,
  rankChoices,
} from "@/lib/choices";
import {
  addChoiceSwipe,
  deleteChoiceMatchIfNotMutual,
  hasMutualChoiceLike,
  insertChoiceMatchRecord,
  listChoiceMatchRecords,
  listChoiceSwipes,
  markAllChoiceMatchesViewed,
  markChoiceMatchViewed,
} from "@/lib/db";
import { HttpError } from "@/lib/http";
import type {
  Choice,
  ChoiceCategory,
  ChoiceMatchSnapshot,
  ChoiceSnapshot,
  SwipeDirection,
} from "@/lib/types";

export async function getChoiceSnapshot(
  sessionId: string,
  category: ChoiceCategory,
): Promise<ChoiceSnapshot> {
  const membership = await requireCoupleMembership(sessionId);
  const swipes = await listChoiceSwipes(sessionId, category);
  const swipedIds = new Set(swipes.map((swipe) => swipe.choiceId));
  const likedIds = swipes
    .filter((swipe) => swipe.direction === "like")
    .map((swipe) => swipe.choiceId);

  const deck = rankChoices(category, sessionId).filter(
    (choice) => !swipedIds.has(choice.id),
  );

  const liked = likedIds
    .map((choiceId) => CHOICES_BY_ID.get(choiceId))
    .filter((choice): choice is Choice => choice !== undefined);

  const matches = (
    await listChoiceMatchRecords(membership.id, sessionId, category)
  )
    .map((record): ChoiceMatchSnapshot | null => {
      const choice = CHOICES_BY_ID.get(record.choiceId);
      if (!choice || choice.category !== category) return null;
      return {
        category: record.category,
        choiceId: record.choiceId,
        choice,
        matchedAt: record.createdAt,
        seen: record.seen === 1,
      };
    })
    .filter((match): match is ChoiceMatchSnapshot => match !== null);

  return {
    category,
    deck,
    matches,
    liked,
    swiped: swipes.length,
    total: CHOICES_BY_CATEGORY[category].length,
    unread: matches.filter((match) => !match.seen).length,
  };
}

/**
 * Enregistre un choix et renvoie la carte uniquement quand le match vient
 * d'être créé, pour déclencher une célébration une seule fois.
 */
export async function swipeChoiceForSession(
  sessionId: string,
  category: ChoiceCategory,
  choiceId: string,
  direction: SwipeDirection,
  now: number = Date.now(),
): Promise<Choice | null> {
  const membership = await requireCompleteCouple(sessionId);
  const choice = CHOICES_BY_ID.get(choiceId);

  if (!choice || choice.category !== category) {
    throw new HttpError(400, "Cette carte n’existe pas dans ce catalogue.");
  }

  await addChoiceSwipe(sessionId, category, choiceId, direction, now);

  if (direction === "pass") {
    await deleteChoiceMatchIfNotMutual(membership.id, category, choiceId);
    return null;
  }

  if (!(await hasMutualChoiceLike(membership.id, category, choiceId))) return null;

  const created = await insertChoiceMatchRecord(
    membership.id,
    category,
    choiceId,
    now,
  );
  if (!created) return null;

  // La personne qui vient de swiper voit son match immédiatement.
  await markChoiceMatchViewed(membership.id, category, choiceId, sessionId, now);
  return choice;
}

export async function markChoiceMatchesSeenForSession(
  sessionId: string,
  category: ChoiceCategory,
  now: number = Date.now(),
): Promise<number> {
  const membership = await requireCompleteCouple(sessionId);
  await markAllChoiceMatchesViewed(membership.id, category, sessionId, now);
  return (await getChoiceSnapshot(sessionId, category)).unread;
}

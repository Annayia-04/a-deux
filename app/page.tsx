import { cookies } from "next/headers";
import { DateSwipeApp } from "@/components/date-swipe-app";
import { SESSION_COOKIE } from "@/lib/session";
import { loadSessionByToken, toPublicSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const session = loadSessionByToken(token);

  return (
    <DateSwipeApp initialSession={session ? toPublicSnapshot(session) : null} />
  );
}

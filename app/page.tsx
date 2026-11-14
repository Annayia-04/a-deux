import { cookies } from "next/headers";
import { DateSwipeApp } from "@/components/date-swipe-app";
import { currentAccount, toAccountSnapshot } from "@/lib/auth/account";
import { enabledAuthProviders } from "@/lib/config";
import { SESSION_COOKIE } from "@/lib/session";
import { loadSessionByToken, toPublicSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;

  // Le compte et la session sont résolus côté serveur : le navigateur ne
  // reçoit qu'un instantané déjà filtré, jamais un jeton.
  const [session, account] = await Promise.all([
    Promise.resolve(loadSessionByToken(token)),
    currentAccount(),
  ]);

  return (
    <DateSwipeApp
      initialSession={session ? toPublicSnapshot(session) : null}
      account={account ? toAccountSnapshot(account) : null}
      authProviders={enabledAuthProviders()}
    />
  );
}

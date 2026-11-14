import { describe, expect, it } from "vitest";
import {
  createOAuthState,
  OAUTH_TTL_MS,
  openOAuthState,
  pkceChallenge,
  sealOAuthState,
} from "@/lib/auth/state";

const SECRET = "secret-de-test-uniquement";

describe("cookie d'état OAuth", () => {
  it("scelle puis relit un état intègre", () => {
    const payload = createOAuthState("google");
    const sealed = sealOAuthState(payload, SECRET);
    const opened = openOAuthState(sealed, SECRET);

    expect(opened).toEqual(payload);
    expect(payload.state).not.toBe(payload.nonce);
    expect(payload.verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("refuse une signature forgée ou un autre secret", () => {
    const payload = createOAuthState("google");
    const sealed = sealOAuthState(payload, SECRET);
    const [body] = sealed.split(".");

    expect(openOAuthState(`${body}.signature-bidon`, SECRET)).toBeNull();
    expect(openOAuthState(sealed, "un-autre-secret")).toBeNull();
    expect(openOAuthState(null, SECRET)).toBeNull();
    expect(openOAuthState("", SECRET)).toBeNull();
    expect(openOAuthState("sans-point", SECRET)).toBeNull();
  });

  it("refuse un contenu modifié même si la signature est recopiée", () => {
    const payload = createOAuthState("google");
    const sealed = sealOAuthState(payload, SECRET);
    const signature = sealed.slice(sealed.lastIndexOf(".") + 1);
    const forgedBody = Buffer.from(
      JSON.stringify({ ...payload, nonce: "nonce-attaquant" }),
    ).toString("base64url");

    expect(openOAuthState(`${forgedBody}.${signature}`, SECRET)).toBeNull();
  });

  it("refuse un état expiré ou daté dans le futur", () => {
    const now = Date.now();
    const payload = { ...createOAuthState("apple"), iat: now - OAUTH_TTL_MS - 1 };
    const sealed = sealOAuthState(payload, SECRET);

    expect(openOAuthState(sealed, SECRET, { now })).toBeNull();
    expect(
      openOAuthState(sealOAuthState({ ...payload, iat: now + 120_000 }, SECRET), SECRET, {
        now,
      }),
    ).toBeNull();
    expect(openOAuthState(sealed, SECRET, { now: now - OAUTH_TTL_MS })).not.toBeNull();
  });

  it("calcule un challenge PKCE S256 conforme (RFC 7636)", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

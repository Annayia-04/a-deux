import {
  generateKeyPairSync,
  sign as signData,
  type KeyObject,
} from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildGoogleAuthorizationUrl,
  GoogleAuthError,
  resetJwksCache,
  verifyGoogleIdToken,
  type GoogleJwk,
} from "@/lib/auth/google";

const CLIENT_ID = "client-test.apps.googleusercontent.com";
const KID = "cle-de-test";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const jwk: GoogleJwk = {
  ...(publicKey.export({ format: "jwk" }) as Record<string, string>),
  kty: "RSA",
  kid: KID,
  alg: "RS256",
  use: "sig",
};

const jwks = { keys: [jwk] };

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

type Claims = Record<string, unknown>;

function makeToken(
  claims: Claims,
  options: { key?: KeyObject; kid?: string; alg?: string } = {},
): string {
  const header = base64url(
    JSON.stringify({ alg: options.alg ?? "RS256", kid: options.kid ?? KID, typ: "JWT" }),
  );
  const payload = base64url(JSON.stringify(claims));
  const signature = signData(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    options.key ?? privateKey,
  );
  return `${header}.${payload}.${signature.toString("base64url")}`;
}

const NOW = 1_780_000_000_000;
const NONCE = "nonce-de-test";

function validClaims(overrides: Claims = {}): Claims {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "1234567890",
    exp: Math.floor(NOW / 1000) + 600,
    iat: Math.floor(NOW / 1000) - 10,
    nonce: NONCE,
    email: "camille@example.com",
    email_verified: true,
    name: "  Camille   Martin ",
    ...overrides,
  };
}

afterAll(() => {
  resetJwksCache();
});

describe("URL d'autorisation Google", () => {
  it("contient les paramètres OIDC attendus, dont PKCE S256", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: CLIENT_ID,
        redirectUri: "http://localhost:3000/api/auth/google/callback",
        state: "etat",
        nonce: "nonce",
        codeChallenge: "challenge",
      }),
    );

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("etat");
    expect(url.searchParams.get("nonce")).toBe("nonce");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback",
    );
    // Aucun secret ne doit jamais apparaître dans l'URL.
    expect(url.searchParams.has("client_secret")).toBe(false);
  });
});

describe("vérification de l'id_token Google", () => {
  it("accepte un jeton valide et normalise l'identité", async () => {
    const identity = await verifyGoogleIdToken(makeToken(validClaims()), {
      clientId: CLIENT_ID,
      nonce: NONCE,
      jwks,
      now: NOW,
    });

    expect(identity).toEqual({
      subject: "1234567890",
      email: "camille@example.com",
      emailVerified: true,
      name: "Camille Martin",
    });
  });

  it("tolère l'émetteur historique « accounts.google.com »", async () => {
    const identity = await verifyGoogleIdToken(
      makeToken(validClaims({ iss: "accounts.google.com" })),
      { clientId: CLIENT_ID, nonce: NONCE, jwks, now: NOW },
    );
    expect(identity.subject).toBe("1234567890");
  });

  it("rejette une signature falsifiée", async () => {
    const token = makeToken(validClaims());
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.${base64url("faux")}`;

    await expect(
      verifyGoogleIdToken(tampered, { clientId: CLIENT_ID, nonce: NONCE, jwks, now: NOW }),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette un jeton signé par une autre clé", async () => {
    const { privateKey: otherKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });

    await expect(
      verifyGoogleIdToken(makeToken(validClaims(), { key: otherKey }), {
        clientId: CLIENT_ID,
        nonce: NONCE,
        jwks,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette une clé inconnue (kid absent du JWKS)", async () => {
    await expect(
      verifyGoogleIdToken(makeToken(validClaims(), { kid: "inconnu" }), {
        clientId: CLIENT_ID,
        nonce: NONCE,
        jwks,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette un algorithme autre que RS256", async () => {
    await expect(
      verifyGoogleIdToken(makeToken(validClaims(), { alg: "HS256" }), {
        clientId: CLIENT_ID,
        nonce: NONCE,
        jwks,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette un nonce différent", async () => {
    await expect(
      verifyGoogleIdToken(makeToken(validClaims({ nonce: "autre" })), {
        clientId: CLIENT_ID,
        nonce: NONCE,
        jwks,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette une audience ou un émetteur étrangers", async () => {
    const options = { clientId: CLIENT_ID, nonce: NONCE, jwks, now: NOW };
    await expect(
      verifyGoogleIdToken(makeToken(validClaims({ aud: "autre-client" })), options),
    ).rejects.toBeInstanceOf(GoogleAuthError);
    await expect(
      verifyGoogleIdToken(makeToken(validClaims({ iss: "https://evil.test" })), options),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette un jeton expiré ou émis dans le futur", async () => {
    const options = { clientId: CLIENT_ID, nonce: NONCE, jwks, now: NOW };
    await expect(
      verifyGoogleIdToken(
        makeToken(validClaims({ exp: Math.floor(NOW / 1000) - 1 })),
        options,
      ),
    ).rejects.toBeInstanceOf(GoogleAuthError);
    await expect(
      verifyGoogleIdToken(
        makeToken(validClaims({ iat: Math.floor(NOW / 1000) + 900 })),
        options,
      ),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("rejette un jeton sans sujet ou mal formé", async () => {
    const options = { clientId: CLIENT_ID, nonce: NONCE, jwks, now: NOW };
    await expect(
      verifyGoogleIdToken(makeToken(validClaims({ sub: "" })), options),
    ).rejects.toBeInstanceOf(GoogleAuthError);
    await expect(verifyGoogleIdToken("a.b", options)).rejects.toBeInstanceOf(
      GoogleAuthError,
    );
    await expect(
      verifyGoogleIdToken("un.deux.trois", options),
    ).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("accepte un email non vérifié sans le marquer vérifié", async () => {
    const identity = await verifyGoogleIdToken(
      makeToken(validClaims({ email_verified: false })),
      { clientId: CLIENT_ID, nonce: NONCE, jwks, now: NOW },
    );
    expect(identity.emailVerified).toBe(false);
  });
});

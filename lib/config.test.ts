import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appleConfig,
  authCookieSecret,
  databaseUrl,
  enabledAuthProviders,
  googleConfig,
  isPostgresEnabled,
  isProviderConfigured,
} from "@/lib/config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuration serveur", () => {
  it("ignore les valeurs vides ou blanches", () => {
    vi.stubEnv("DATABASE_URL", "   ");
    expect(databaseUrl()).toBeNull();
    expect(isPostgresEnabled()).toBe(false);

    vi.stubEnv("DATABASE_URL", "postgres://localhost/a_deux");
    expect(databaseUrl()).toBe("postgres://localhost/a_deux");
    expect(isPostgresEnabled()).toBe(true);
  });

  it("ne considère Google configuré qu'avec l'identifiant et le secret", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(googleConfig()).toBeNull();
    expect(isProviderConfigured("google")).toBe(false);

    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(googleConfig()).toEqual({
      clientId: "client.apps.googleusercontent.com",
      clientSecret: "secret",
    });
  });

  it("exige les quatre valeurs Apple", () => {
    vi.stubEnv("APPLE_CLIENT_ID", "fr.adeux.web");
    vi.stubEnv("APPLE_TEAM_ID", "TEAM123456");
    vi.stubEnv("APPLE_KEY_ID", "KEY123456");
    expect(appleConfig()).toBeNull();

    vi.stubEnv("APPLE_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----");
    expect(appleConfig()?.keyId).toBe("KEY123456");
    expect(isProviderConfigured("apple")).toBe(true);
  });

  it("n'expose que les fournisseurs réellement configurés", () => {
    expect(enabledAuthProviders()).toEqual([]);

    vi.stubEnv("APPLE_CLIENT_ID", "fr.adeux.web");
    vi.stubEnv("APPLE_TEAM_ID", "TEAM123456");
    vi.stubEnv("APPLE_KEY_ID", "KEY123456");
    vi.stubEnv("APPLE_PRIVATE_KEY", "key");
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");

    expect(enabledAuthProviders()).toEqual(["google", "apple"]);
  });

  it("lit le secret des cookies OAuth", () => {
    vi.stubEnv("APP_SESSION_SECRET", "abc");
    expect(authCookieSecret()).toBe("abc");
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { authCallbackUrl, nextPath, resolveLocale, resolveNext } from "@/lib/auth-redirect";
import { isAuthErrorKey } from "@/lib/auth-errors";

test("resolveNext accepts only allow-listed destinations", () => {
  assert.equal(resolveNext("reset-password"), "reset-password");

  // The value arrives in a link from an email and is echoed into a Location
  // header, so anything unrecognised has to become "no destination" rather
  // than a path.
  for (const hostile of [
    "https://evil.example.com",
    "//evil.example.com",
    "../../evil",
    "/reset-password",
    "reset-password/../../..",
    "",
    null,
  ]) {
    assert.equal(resolveNext(hostile), null, `should reject ${JSON.stringify(hostile)}`);
  }
});

test("nextPath turns a resolved destination into a same-site path", () => {
  assert.equal(nextPath("reset-password"), "/reset-password");
  assert.equal(nextPath(null), "");
});

test("resolveLocale falls back to the default locale", () => {
  assert.equal(resolveLocale("ru"), "ru");
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("xx"), "uz");
  assert.equal(resolveLocale(null), "uz");
});

test("authCallbackUrl carries next only when asked, on the canonical origin", () => {
  // Not development here, so a request-supplied origin must be ignored — a
  // session cookie written for a host the user is not on is silently lost.
  assert.equal(
    authCallbackUrl("uz", "https://attacker.example"),
    "https://surveybase.uz/auth/callback?locale=uz",
  );
  assert.equal(
    authCallbackUrl("ru", null, "reset-password"),
    "https://surveybase.uz/auth/callback?locale=ru&next=reset-password",
  );
});

test("isAuthErrorKey rejects an invented ?authError= value", () => {
  // t() throws on an unknown key, so without this check any stranger with a
  // link could crash the login page.
  assert.ok(isAuthErrorKey("errorResetLinkInvalid"));
  assert.ok(!isAuthErrorKey("notARealKey"));
  assert.ok(!isAuthErrorKey(null));
  assert.ok(!isAuthErrorKey("constructor"));
});

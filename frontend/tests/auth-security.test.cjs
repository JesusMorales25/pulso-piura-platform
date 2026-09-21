/* eslint-disable @typescript-eslint/no-require-imports -- Node ejecuta este archivo CommonJS directamente. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (id) => { if (id in dependencies) return dependencies[id]; throw new Error(`Unexpected import ${id}`); }, URL, Error, DOMException, AbortSignal, Headers, process, atob, fetch: (...args) => global.fetch(...args) });
  return exports;
}
const session = load('lib/auth-session.ts');
const authRoles = load('lib/auth-roles.ts');
function unsignedToken(claims) {
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}
test('platform roles are read from the Keycloak access token', () => {
  const user = {
    expired: false,
    profile: {},
    access_token: unsignedToken({ realm_access: { roles: ['PLATFORM_ADMIN'] } }),
  };
  assert.equal(authRoles.hasRealmRole(user, 'PLATFORM_ADMIN'), true);
  assert.equal(authRoles.hasRealmRole(user, 'TOURNAMENT_ORGANIZER'), false);
  assert.deepEqual([...authRoles.realmRoles({ ...user, access_token: 'invalid' })], []);
});
test('platform roles are read from the configured Auth0 claim', () => {
  const user = {
    expired: false,
    profile: {},
    access_token: unsignedToken({ 'https://pulsopiura.app/roles': ['PLATFORM_ADMIN'] }),
  };
  assert.equal(authRoles.hasRealmRole(user, 'PLATFORM_ADMIN'), true);
});
test('login return accepts local journeys and rejects external or malformed redirects', () => {
  for (const input of ['//evil.test', '/\\evil.test', 'https://evil.test', 'javascript:alert(1)', '/\nevil', '/auth/callback?code=old', null]) assert.equal(session.safeReturnTo(input), '/perfil');
  for (const input of ['/?mode=matches', '/canchas?date=2026-09-07', '/invitaciones/abc', '/perfil#preferencias']) assert.equal(session.safeReturnTo(input), input);
});
test('new accounts complete their profile before returning to the requested journey', () => {
  assert.equal(session.postLoginDestination('/partidos', 'PENDING'), '/perfil');
  assert.equal(session.postLoginDestination('/partidos', 'COMPLETE'), '/partidos');
  assert.equal(session.postLoginDestination('https://evil.test', 'COMPLETE'), '/perfil');
});
test('401 is session expiry only for authenticated calls; no automatic write retries', async () => {
  let calls = 0; const rejected = [];
  const api = load('lib/api.ts', {
    './auth-session': { ...session, rejectToken: (token) => rejected.push(token) },
    './oidc': { getUserManager: () => ({ signinSilent: async () => null }) },
  });
  global.fetch = async () => {
    calls++;
    return new Response(null, {
      status: 401,
      headers: calls === 2 ? { 'WWW-Authenticate': 'Bearer error="invalid_token"' } : {},
    });
  };
  await assert.rejects(api.apiRequest('/matches'), /No pudimos validar/);
  assert.deepEqual(rejected, []);
  await assert.rejects(api.apiRequest('/matches/a/participants/me', 'test-token', { method: 'POST' }), /sesión terminó/);
  assert.deepEqual(rejected, ['test-token']); assert.equal(calls, 2);
  global.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(api.apiRequest('/me', 'test-token'), /no tiene acceso/);
  assert.equal(rejected.length, 1);
});
test('OIDC callback redeems authorization code once during repeated mounts', async () => {
  let calls = 0;
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/oidc.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  class Manager { signinRedirectCallback() { calls++; return Promise.resolve({ access_token: 'test-token' }); } }
  vm.runInNewContext(source, { exports, process, window: { location: { origin: 'http://localhost:3000' }, sessionStorage: {} }, require: () => ({ UserManager: Manager, WebStorageStateStore: class {}, InMemoryWebStorage: class {} }) });
  const first = exports.completeSignin();
  assert.equal(first, exports.completeSignin());
  await first; assert.equal(calls, 1);
});
test('OIDC session survives reloads only within the current browser session', () => {
  const source = fs.readFileSync(path.join(__dirname, '../lib/oidc.ts'), 'utf8');
  assert.match(source, /userStore:\s*new WebStorageStateStore\(\{ store: window\.sessionStorage \}\)/);
  assert.doesNotMatch(source, /localStorage/);
});
test('session expires and rejects only the current token; subscriptions are cleaned up', async () => {
  let effect, rejected, removals = 0, renewals = 0;
  const events = {};
  const changes = [];
  const current = { access_token: 'new-token', expired: false };
  const manager = { getUser: async () => current, signinSilent: async () => { renewals++; throw new Error('expired refresh'); }, removeUser: async () => { removals++; }, clearStaleState: async () => {}, events: new Proxy({}, { get: (_, name) => (callback) => { if (name.startsWith('add')) events[name.slice(3)] = callback; else delete events[name.slice(6)]; } }) };
  const react = { createContext: () => ({ Provider: 'provider' }), useEffect: (fn) => { effect = fn; }, useState: (value) => [value, (next) => changes.push(next)], useRef: (value) => ({ current: value }), useCallback: (fn) => fn, useMemo: (fn) => fn() };
  const auth = load('features/auth/AuthProvider.tsx', { 'react': react, 'react/jsx-runtime': { jsx: () => ({}), jsxs: () => ({}) }, '@/lib/oidc': { getUserManager: () => manager }, '@/lib/api': { apiRequest: async () => ({ avatarUrl: null }) }, '@/lib/auth-roles': { hasRealmRole: () => false }, '@/lib/auth-session': { safeReturnTo: session.safeReturnTo, onRejectedToken: (fn) => { rejected = fn; return () => { rejected = null; }; } } });
  auth.AuthProvider({ children: null }); const cleanup = effect();
  await Promise.resolve(); await Promise.resolve();
  rejected('old-token'); assert.equal(removals, 0);
  rejected('new-token'); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); assert.equal(removals, 1); assert.equal(renewals, 1); assert.ok(changes.includes(null));
  events.UserLoaded(current); events.AccessTokenExpired(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); assert.equal(removals, 2); assert.equal(renewals, 2);
  cleanup(); assert.equal(rejected, null); assert.equal(Object.keys(events).length, 0);
});

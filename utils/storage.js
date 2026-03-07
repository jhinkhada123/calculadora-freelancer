/**
 * Módulo único de storage. Proíbe localStorage/sessionStorage direto fora dele.
 * Persiste apenas state sanitizado (caller responsável por sanitizeState antes de write).
 *
 * Chaves permitidas (whitelist):
 * - STORAGE_KEY: estado da calculadora
 * - LEGACY_STORAGE_KEY: migração
 * - SCENARIOS_KEY: cenários A/B
 * - INTEGRATIONS_KEY: sheets/notion
 * - DISMISSED_ALERTS_KEY (sessionStorage)
 */

const STORAGE_KEY = "freela_precificacao_v2";
const LEGACY_STORAGE_KEY = "freela_precificacao_v1";
const SCENARIOS_KEY = "freela_scenarios_v1";
const INTEGRATIONS_KEY = "freela_integrations_v1";
const DISMISSED_ALERTS_KEY = "freela_dismissed_alerts_v1";

const ALLOWED_KEYS = new Set([STORAGE_KEY, LEGACY_STORAGE_KEY, SCENARIOS_KEY, INTEGRATIONS_KEY]);
const ALLOWED_SESSION_KEYS = new Set([DISMISSED_ALERTS_KEY]);

function guardKey(key, allowed) {
  if (!allowed.has(key)) throw new Error(`Storage key not allowed: ${key}`);
}

export function readLocal(key) {
  guardKey(key, ALLOWED_KEYS);
  try {
    const raw = localStorage.getItem(key);
    return raw;
  } catch {
    return null;
  }
}

export function writeLocal(key, value) {
  guardKey(key, ALLOWED_KEYS);
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key) {
  guardKey(key, ALLOWED_KEYS);
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readSession(key) {
  guardKey(key, ALLOWED_SESSION_KEYS);
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key, value) {
  guardKey(key, ALLOWED_SESSION_KEYS);
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export const STORAGE_KEYS = {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  SCENARIOS_KEY,
  INTEGRATIONS_KEY,
  DISMISSED_ALERTS_KEY,
};

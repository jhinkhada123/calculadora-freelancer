import { readLocal, writeLocal, removeLocal, readSession, writeSession, STORAGE_KEYS } from "./storage.js";

const mockStorage = (type) => {
  const store = {};
  const get = (k) => store[k] ?? null;
  const set = (k, v) => { store[k] = v; };
  const remove = (k) => { delete store[k]; };
  if (type === "local") {
    global.localStorage = { getItem: get, setItem: set, removeItem: remove };
  } else {
    global.sessionStorage = { getItem: get, setItem: set, removeItem: remove };
  }
  return store;
};

describe("storage", () => {
  beforeEach(() => {
    const local = {};
    const session = {};
    global.localStorage = {
      getItem: (k) => local[k] ?? null,
      setItem: (k, v) => { local[k] = v; },
      removeItem: (k) => { delete local[k]; },
    };
    global.sessionStorage = {
      getItem: (k) => session[k] ?? null,
      setItem: (k, v) => { session[k] = v; },
      removeItem: (k) => { delete session[k]; },
    };
  });

  test("writeLocal e readLocal com STORAGE_KEY", () => {
    const data = JSON.stringify({ schemaVersion: 2, data: { currency: "BRL" } });
    writeLocal(STORAGE_KEYS.STORAGE_KEY, data);
    expect(readLocal(STORAGE_KEYS.STORAGE_KEY)).toBe(data);
  });

  test("rejeita chave não permitida", () => {
    expect(() => readLocal("invalid_key")).toThrow("Storage key not allowed");
    expect(() => writeLocal("invalid_key", "x")).toThrow("Storage key not allowed");
  });

  test("writeSession e readSession com DISMISSED_ALERTS_KEY", () => {
    const data = JSON.stringify({ alert1: true });
    writeSession(STORAGE_KEYS.DISMISSED_ALERTS_KEY, data);
    expect(readSession(STORAGE_KEYS.DISMISSED_ALERTS_KEY)).toBe(data);
  });

  test("removeLocal remove item", () => {
    writeLocal(STORAGE_KEYS.STORAGE_KEY, "x");
    removeLocal(STORAGE_KEYS.STORAGE_KEY);
    expect(readLocal(STORAGE_KEYS.STORAGE_KEY)).toBeNull();
  });
});

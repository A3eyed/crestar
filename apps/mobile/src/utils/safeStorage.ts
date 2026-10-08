import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hardened, drop-in replacement for AsyncStorage.
 *
 * WHY THIS EXISTS
 * ---------------
 * AsyncStorage's iOS methods are void-returning and run asynchronously on the
 * module's own serial dispatch queue. If JavaScript hands them a key or value
 * that is not a string, the value arrives natively as `NSNull` and the native
 * code raises an Objective-C exception (`unrecognized selector sent to
 * instance NSNull`) on that background queue.
 *
 * Because the throw happens on a dispatch queue — NOT inside the JS call
 * stack — a JS `try/catch` around `await AsyncStorage.setItem(...)` CANNOT
 * catch it. The exception is unhandled, ObjC calls `std::terminate`, and the
 * process aborts with SIGABRT before any JS error handler ever runs.
 *
 * The most common way to hit this by accident:
 *
 *   JSON.stringify(undefined) === undefined   // NOT the string "undefined"
 *   await AsyncStorage.setItem('user', JSON.stringify(user))  // 💥 if user is undefined
 *
 * Every store in this app goes through this wrapper so a stray `undefined`
 * degrades into a no-op (or a delete) instead of killing the app at launch.
 */

type StorageValue = string | null;

function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0;
}

/**
 * Coerce an outgoing value into something the native layer can always accept.
 * `undefined` / `null` return null, which callers treat as "remove this key"
 * — that matches what the caller almost certainly meant.
 */
function normalizeValue(value: unknown): StorageValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return null;
  }
}

async function getItem(key: unknown): Promise<StorageValue> {
  if (!isValidKey(key)) {
    console.warn('[safeStorage] getItem called with an invalid key:', key);
    return null;
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`[safeStorage] getItem("${key}") failed:`, error);
    return null;
  }
}

async function setItem(key: unknown, value: unknown): Promise<void> {
  if (!isValidKey(key)) {
    console.warn('[safeStorage] setItem called with an invalid key:', key);
    return;
  }

  const normalized = normalizeValue(value);

  // Writing "nothing" is a delete, never a native null write.
  if (normalized === null) {
    await removeItem(key);
    return;
  }

  try {
    await AsyncStorage.setItem(key, normalized);
  } catch (error) {
    console.error(`[safeStorage] setItem("${key}") failed:`, error);
  }
}

async function removeItem(key: unknown): Promise<void> {
  if (!isValidKey(key)) {
    console.warn('[safeStorage] removeItem called with an invalid key:', key);
    return;
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[safeStorage] removeItem("${key}") failed:`, error);
  }
}

async function mergeItem(key: unknown, value: unknown): Promise<void> {
  if (!isValidKey(key)) {
    console.warn('[safeStorage] mergeItem called with an invalid key:', key);
    return;
  }
  const normalized = normalizeValue(value);
  if (normalized === null) return;
  try {
    await AsyncStorage.mergeItem(key, normalized);
  } catch (error) {
    console.error(`[safeStorage] mergeItem("${key}") failed:`, error);
  }
}

async function multiGet(keys: unknown): Promise<[string, StorageValue][]> {
  const validKeys = Array.isArray(keys) ? keys.filter(isValidKey) : [];
  if (validKeys.length === 0) return [];
  try {
    const result = await AsyncStorage.multiGet(validKeys);
    return result as [string, StorageValue][];
  } catch (error) {
    console.error('[safeStorage] multiGet failed:', error);
    return [];
  }
}

async function multiSet(pairs: unknown): Promise<void> {
  if (!Array.isArray(pairs)) return;

  const safePairs: [string, string][] = [];
  const keysToRemove: string[] = [];

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length === 0) continue;
    const [key, value] = pair;
    if (!isValidKey(key)) continue;
    const normalized = normalizeValue(value);
    if (normalized === null) {
      keysToRemove.push(key);
    } else {
      safePairs.push([key, normalized]);
    }
  }

  try {
    if (safePairs.length > 0) await AsyncStorage.multiSet(safePairs);
    if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
  } catch (error) {
    console.error('[safeStorage] multiSet failed:', error);
  }
}

async function multiRemove(keys: unknown): Promise<void> {
  const validKeys = Array.isArray(keys) ? keys.filter(isValidKey) : [];
  if (validKeys.length === 0) return;
  try {
    await AsyncStorage.multiRemove(validKeys);
  } catch (error) {
    console.error('[safeStorage] multiRemove failed:', error);
  }
}

async function getAllKeys(): Promise<readonly string[]> {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('[safeStorage] getAllKeys failed:', error);
    return [];
  }
}

async function clear(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('[safeStorage] clear failed:', error);
  }
}

const safeStorage = {
  getItem,
  setItem,
  removeItem,
  mergeItem,
  multiGet,
  multiSet,
  multiRemove,
  getAllKeys,
  clear,
};

export default safeStorage;

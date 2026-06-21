import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.join(os.homedir(), "Library", "Application Support", "ollama-chat-app");
export const CHATS_FILE = path.join(DATA_DIR, "chats.json");
const LEGACY_CHATS_FILE = path.join(__dirname, "..", "data", "chats.json");
export const MAX_STORED_CHATS = 100;

export function normalizeChatStore(data) {
  return {
    activeChatId: data?.activeChatId ?? null,
    chats: Array.isArray(data?.chats) ? data.chats : [],
    savedAt: data?.savedAt ?? null,
  };
}

function isPersistedChat(chat) {
  return Boolean(chat?.id && Array.isArray(chat.uiMessages) && chat.uiMessages.length > 0);
}

export function readChatsFile() {
  const candidates = [CHATS_FILE, LEGACY_CHATS_FILE];
  let best = { activeChatId: null, chats: [], savedAt: null };

  for (const filePath of candidates) {
    try {
      const parsed = normalizeChatStore(JSON.parse(fs.readFileSync(filePath, "utf8")));
      if (parsed.chats.length > best.chats.length) {
        best = parsed;
      }
    } catch {
      // try next location
    }
  }

  return best;
}

/** Union merge — used when loading/combining multiple sources. */
export function mergeChatStores(...stores) {
  const map = new Map();

  for (const store of stores) {
    if (!store) continue;
    for (const chat of store.chats || []) {
      if (!isPersistedChat(chat)) continue;
      const existing = map.get(chat.id);
      if (!existing || (chat.updatedAt || 0) >= (existing.updatedAt || 0)) {
        map.set(chat.id, chat);
      }
    }
  }

  const chats = [...map.values()]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_STORED_CHATS);

  const preferredActive = stores
    .map((store) => store?.activeChatId)
    .find((id) => id && chats.some((chat) => chat.id === id));

  return {
    activeChatId: preferredActive || chats[0]?.id || null,
    chats,
    savedAt: Date.now(),
  };
}

function pickNewerChat(incoming, existing) {
  if (!existing) return incoming;
  return (incoming.updatedAt || 0) >= (existing.updatedAt || 0) ? incoming : existing;
}

function writeChatsToDisk(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${CHATS_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempFile, CHATS_FILE);
}

/** Save with incoming chat list as membership authority when the payload is current. */
export function saveChatsFile(incoming) {
  const existing = readChatsFile();
  const inc = normalizeChatStore(incoming);

  if (inc.chats.length === 0 && existing.chats.length > 0) {
    return { ...existing, skipped: true };
  }

  const incomingIsNewer = (inc.savedAt || 0) >= (existing.savedAt || 0);
  const looksLikeStalePartialSave =
    !incomingIsNewer && inc.chats.length > 0 && inc.chats.length < existing.chats.length;

  if (looksLikeStalePartialSave) {
    const merged = mergeChatStores(existing, inc);
    writeChatsToDisk(merged);
    return merged;
  }

  const existingById = new Map(existing.chats.map((chat) => [chat.id, chat]));
  const chats = inc.chats
    .filter(isPersistedChat)
    .map((chat) => pickNewerChat(chat, existingById.get(chat.id)))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_STORED_CHATS);

  const activeChatId =
    inc.activeChatId && chats.some((chat) => chat.id === inc.activeChatId)
      ? inc.activeChatId
      : chats[0]?.id || null;

  const saved = { activeChatId, chats, savedAt: Date.now() };
  writeChatsToDisk(saved);
  return saved;
}
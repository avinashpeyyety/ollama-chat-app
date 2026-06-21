const modelSelect = document.getElementById("model-select");
const thinkToggle = document.getElementById("think-toggle");
const newChatBtn = document.getElementById("new-chat");
const statusEl = document.getElementById("status");
const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const attachmentsEl = document.getElementById("attachments");
const activeModelEl = document.getElementById("active-model");
const historyListEl = document.getElementById("history-list");
const serverStartBtn = document.getElementById("server-start");
const serverStopBtn = document.getElementById("server-stop");
const serverRestartBtn = document.getElementById("server-restart");
const serverStatusDot = document.getElementById("server-status-dot");
const serverStatusText = document.getElementById("server-status-text");

const STORAGE_KEY = "ollama-chat-sessions";
const MAX_ATTACHMENTS = 5;
const MAX_TEXT_FILE_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CONTEXT_CHARS = 120000;
const MAX_STORED_CHATS = 100;

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go",
  ".rs", ".java", ".c", ".cpp", ".h", ".css", ".html", ".xml", ".yaml",
  ".yml", ".csv", ".sql", ".sh", ".toml", ".log", ".env",
]);

const ALL_MODELS_VALUE = "__all_models__";
const EXCLUDED_MODELS = new Set(["qwen:latest"]);

const SYSTEM_PROMPT = {
  role: "system",
  content:
    "You are a helpful assistant. Always respond in English unless the user explicitly writes in another language.",
};

let chats = [];
let activeChatId = null;
let pendingChat = null;
let attachedFiles = [];
let modelCapabilities = new Map();
let availableModels = [];
let isStreaming = false;
let serverPersistenceCapable = false;
let serverWarningShown = false;

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getActiveChat() {
  if (pendingChat && pendingChat.id === activeChatId) return pendingChat;
  return chats.find((chat) => chat.id === activeChatId) || null;
}

function getPersistedChats() {
  return chats.filter((chat) => chat.uiMessages.length > 0);
}

function isAllModelsMode(model = modelSelect.value) {
  return model === ALL_MODELS_VALUE;
}

function getSelectableModels() {
  return availableModels.filter((name) => !EXCLUDED_MODELS.has(name));
}

function ensureChatConversations(chat) {
  if (!chat.conversations) {
    chat.conversations = {};
  }
  if (chat.conversation?.length && chat.model && chat.model !== ALL_MODELS_VALUE) {
    if (!chat.conversations[chat.model]) {
      chat.conversations[chat.model] = chat.conversation;
    }
  }
}

function getModelConversation(chat, model) {
  ensureChatConversations(chat);
  if (!chat.conversations[model]) {
    chat.conversations[model] = [{ ...SYSTEM_PROMPT }];
  } else if (chat.conversations[model][0]?.role !== "system") {
    chat.conversations[model].unshift({ ...SYSTEM_PROMPT });
  }
  return chat.conversations[model];
}

function formatModelLabel(model) {
  if (model === ALL_MODELS_VALUE) return "all models";
  return model || "unknown model";
}

function updateActiveModelHeader(model = modelSelect.value) {
  activeModelEl.textContent = formatModelLabel(model) || "select model";
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function setComposerEnabled(enabled) {
  const disabled = !enabled || isStreaming;
  messageInput.disabled = disabled;
  sendBtn.disabled = disabled;
  attachBtn.disabled = disabled;
}

function getExtension(name) {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index).toLowerCase();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function modelSupportsVision(modelName) {
  const capabilities = modelCapabilities.get(modelName) || [];
  if (capabilities.includes("vision")) return true;
  return /qwen3\.5|llava|moondream|minicpm-v|bakllava|gemma3/i.test(modelName);
}

function makeChatTitle(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "new chat";
  return cleaned.length > 36 ? `${cleaned.slice(0, 36)}…` : cleaned;
}

function stripMessageForStorage(message) {
  const stored = { role: message.role, content: message.content };
  if (message.images?.length) {
    stored.hadImages = true;
  }
  return stored;
}

function serializeConversations(chat) {
  const serialized = {};
  const source = chat.conversations || {};
  for (const [model, messages] of Object.entries(source)) {
    serialized[model] = messages.map(stripMessageForStorage);
  }
  if (chat.conversation?.length && chat.model && !serialized[chat.model]) {
    serialized[chat.model] = chat.conversation.map(stripMessageForStorage);
  }
  return serialized;
}

function serializeChat(chat) {
  return {
    id: chat.id,
    title: chat.title,
    model: chat.model,
    think: chat.think,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    uiMessages: chat.uiMessages,
    conversations: serializeConversations(chat),
  };
}

function buildSavePayload() {
  const persisted = getPersistedChats().slice(0, MAX_STORED_CHATS);
  const activeExists = persisted.some((chat) => chat.id === activeChatId);
  return {
    activeChatId: activeExists ? activeChatId : persisted[0]?.id || null,
    chats: persisted.map(serializeChat),
    savedAt: Date.now(),
  };
}

function readLocalChatStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mergePayloadForLocalSave(payload) {
  const localStore = readLocalChatStore();
  if (!localStore?.chats?.length) {
    return payload;
  }

  const localById = new Map(
    localStore.chats
      .filter((chat) => chat?.id && chat.uiMessages?.length)
      .map((chat) => [chat.id, chat])
  );

  const mergedChats = payload.chats.map((incomingChat) => {
    const localChat = localById.get(incomingChat.id);
    if (!localChat) return incomingChat;
    return (incomingChat.updatedAt || 0) >= (localChat.updatedAt || 0)
      ? incomingChat
      : localChat;
  });

  return {
    activeChatId: payload.activeChatId,
    chats: mergedChats,
    savedAt: payload.savedAt,
  };
}

function normalizeLoadedChat(chat) {
  const normalized = {
    ...chat,
    uiMessages: chat.uiMessages || [],
    conversation: chat.conversation || [],
    conversations: chat.conversations || {},
  };

  if (normalized.conversation.length && normalized.model && !normalized.conversations[normalized.model]) {
    normalized.conversations[normalized.model] = normalized.conversation;
  }

  return normalized;
}

function mergeChatStores(...stores) {
  const map = new Map();

  for (const store of stores) {
    if (!store?.chats) continue;
    for (const chat of store.chats) {
      if (!chat?.id || !chat.uiMessages?.length) continue;
      const normalized = normalizeLoadedChat(chat);
      const existing = map.get(chat.id);
      if (!existing || (normalized.updatedAt || 0) >= (existing.updatedAt || 0)) {
        map.set(chat.id, normalized);
      }
    }
  }

  const mergedChats = [...map.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const activeChatId = stores
    .map((store) => store?.activeChatId)
    .find((id) => id && mergedChats.some((chat) => chat.id === id));

  return {
    activeChatId: activeChatId || mergedChats[0]?.id || null,
    chats: mergedChats,
  };
}

function applyLoadedChats(data) {
  chats = (data.chats || []).map(normalizeLoadedChat);
  pendingChat = null;
  activeChatId = data.activeChatId || chats[0]?.id || null;
  return chats.length > 0;
}

async function checkServerPersistence() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data.ok && data.chatsApi);
  } catch {
    return false;
  }
}

function showServerRestartHint() {
  if (serverWarningShown) return;
  serverWarningShown = true;
  setStatus("saved locally · disk backup unavailable until server is restarted", true);
}

async function saveChatsToDisk(payload) {
  if (!serverPersistenceCapable) {
    return false;
  }

  try {
    const response = await fetch("/api/chats", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (response.ok) {
      return true;
    }
    if (response.status === 404) {
      serverPersistenceCapable = false;
      showServerRestartHint();
      return false;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(`disk save warning: ${data.error || response.status}`, true);
    return false;
  } catch {
    return false;
  }
}

async function saveChats() {
  const payload = mergePayloadForLocalSave(buildSavePayload());
  if (payload.chats.length === 0) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    setStatus(`local save warning: ${error.message}`, true);
    return false;
  }

  await saveChatsToDisk(payload);
  return true;
}

async function loadChats() {
  let serverData = null;
  let localData = null;

  try {
    const response = await fetch("/api/chats");
    if (response.ok) {
      serverData = await response.json();
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  const merged = mergeChatStores(serverData, localData);
  if (merged.chats.length === 0) {
    chats = [];
    activeChatId = null;
    pendingChat = null;
    return false;
  }

  applyLoadedChats(merged);

  // sync merged state back to both stores
  const payload = {
    activeChatId: merged.activeChatId,
    chats: merged.chats.map(serializeChat),
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  await saveChatsToDisk(payload);

  return true;
}

function createPendingChat(model = modelSelect.value || "") {
  const chat = {
    id: crypto.randomUUID(),
    title: "new chat",
    model,
    think: thinkToggle.checked,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    uiMessages: [],
    conversation: [],
  };
  pendingChat = chat;
  activeChatId = chat.id;
  return chat;
}

function commitChat(chat) {
  pendingChat = null;
  if (!chats.some((item) => item.id === chat.id)) {
    chats.unshift(chat);
  }
  touchChat(chat);
}

function touchChat(chat) {
  chat.updatedAt = Date.now();
  chats = [chat, ...chats.filter((item) => item.id !== chat.id)];
}

function clearEmptyState() {
  const empty = messagesEl.querySelector(".empty-state");
  if (empty) empty.remove();
}

function renderAttachmentChips() {
  attachmentsEl.innerHTML = "";
  if (attachedFiles.length === 0) {
    attachmentsEl.classList.add("hidden");
    return;
  }

  attachmentsEl.classList.remove("hidden");
  for (const file of attachedFiles) {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    chip.innerHTML = `
      <span class="name" title="${file.name}">${file.name}</span>
      <span class="meta">${file.kind === "image" ? "image" : "text"} · ${formatBytes(file.size)}</span>
      <button type="button" aria-label="Remove ${file.name}">×</button>
    `;
    chip.querySelector("button").addEventListener("click", () => {
      attachedFiles = attachedFiles.filter((item) => item.id !== file.id);
      renderAttachmentChips();
    });
    attachmentsEl.appendChild(chip);
  }
}

function formatRole(role, modelName = null) {
  if (role === "user") return "you";
  if (role === "assistant" && modelName) return modelName;
  if (role === "assistant") return "ai";
  return role;
}

function addMessage(role, content, attachmentNames = [], extraClass = "", modelName = null) {
  clearEmptyState();
  const node = document.createElement("div");
  node.className = `message ${role} ${extraClass}`.trim();
  if (modelName) {
    node.dataset.model = modelName;
  }

  let attachmentsHtml = "";
  if (attachmentNames.length > 0) {
    attachmentsHtml = `<div class="message-attachments">${attachmentNames
      .map((name) => `<span class="message-attachment">${escapeHtml(name)}</span>`)
      .join("")}</div>`;
  }

  node.innerHTML = `
    ${attachmentsHtml}
    <div class="message-line">
      <span class="role">${escapeHtml(formatRole(role, modelName))}</span>
      <span class="content"></span>
    </div>
  `;
  node.querySelector(".content").textContent = content;
  messagesEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return node;
}

function renderEmptyState() {
  messagesEl.innerHTML = `
    <div class="empty-state">
      <h3>ready</h3>
      <p>pick a model and send a message</p>
    </div>
  `;
}

function renderMessages(chat) {
  attachedFiles = [];
  renderAttachmentChips();
  fileInput.value = "";

  if (!chat || chat.uiMessages.length === 0) {
    renderEmptyState();
    return;
  }

  messagesEl.innerHTML = "";
  for (const message of chat.uiMessages) {
    const modelName =
      message.modelName ||
      (message.role === "assistant" && chat.model !== ALL_MODELS_VALUE ? chat.model : null);
    addMessage(
      message.role,
      message.content,
      message.attachmentNames || [],
      "",
      modelName
    );
  }
}

function renderHistoryList() {
  historyListEl.innerHTML = "";

  if (chats.length === 0) {
    historyListEl.innerHTML = `<div class="history-empty">no saved chats</div>`;
    return;
  }

  for (const chat of chats) {
    if (chat.uiMessages.length === 0) continue;

    const item = document.createElement("button");
    item.type = "button";
    item.className = `history-item${chat.id === activeChatId ? " active" : ""}`;
    const msgCount = chat.uiMessages.length;
    item.innerHTML = `
      <span class="title">${escapeHtml(chat.title)}</span>
      <span class="meta">${formatTime(chat.updatedAt)} · ${msgCount} msgs · ${escapeHtml(formatModelLabel(chat.model) || "no model")}</span>
      <span class="delete-btn" title="Delete chat">×</span>
    `;

    item.addEventListener("click", () => {
      switchChat(chat.id);
    });

    item.querySelector(".delete-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      deleteChat(chat.id);
    });

    historyListEl.appendChild(item);
  }
}

function applyChatSettings(chat) {
  if (chat.model && [...modelSelect.options].some((opt) => opt.value === chat.model)) {
    modelSelect.value = chat.model;
  }
  thinkToggle.checked = Boolean(chat.think);
  updateActiveModelHeader(modelSelect.value);
}

function switchChat(chatId) {
  if (chatId === activeChatId) return;
  const chat = chats.find((item) => item.id === chatId);
  if (!chat) return;

  pendingChat = null;
  activeChatId = chat.id;
  applyChatSettings(chat);
  renderMessages(chat);
  renderHistoryList();
  saveChats();
  setStatus(`loaded · ${chat.uiMessages.length} msgs`);
}

function deleteChat(chatId) {
  chats = chats.filter((chat) => chat.id !== chatId);

  if (activeChatId === chatId) {
    if (chats.length > 0) {
      activeChatId = chats[0].id;
      applyChatSettings(chats[0]);
      renderMessages(chats[0]);
    } else {
      createPendingChat(modelSelect.value);
      applyChatSettings(pendingChat);
      renderEmptyState();
    }
  }

  renderHistoryList();
  saveChats();
}

function startNewChat() {
  createPendingChat(modelSelect.value);
  applyChatSettings(pendingChat);
  renderEmptyState();
  renderHistoryList();
  setStatus("new chat");
  messageInput.focus();
}

function resetComposer() {
  attachedFiles = [];
  renderAttachmentChips();
  fileInput.value = "";
}

async function readFileAsText(file) {
  return file.text();
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function processSelectedFiles(fileList) {
  const remainingSlots = MAX_ATTACHMENTS - attachedFiles.length;
  if (remainingSlots <= 0) {
    setStatus(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`, true);
    return;
  }

  const files = Array.from(fileList).slice(0, remainingSlots);

  for (const file of files) {
    const extension = getExtension(file.name);
    const isImage = file.type.startsWith("image/");
    const isText = TEXT_EXTENSIONS.has(extension) || file.type.startsWith("text/");

    if (!isImage && !isText) {
      setStatus(`Unsupported file type: ${file.name}`, true);
      continue;
    }

    if (isImage) {
      if (file.size > MAX_IMAGE_BYTES) {
        setStatus(`${file.name} is too large (max ${formatBytes(MAX_IMAGE_BYTES)}).`, true);
        continue;
      }

      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.split(",")[1];
      attachedFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        kind: "image",
        size: file.size,
        base64,
      });
      continue;
    }

    if (file.size > MAX_TEXT_FILE_BYTES) {
      setStatus(`${file.name} is too large (max ${formatBytes(MAX_TEXT_FILE_BYTES)}).`, true);
      continue;
    }

    const text = await readFileAsText(file);
    attachedFiles.push({
      id: crypto.randomUUID(),
      name: file.name,
      kind: "text",
      size: file.size,
      text,
    });
  }

  renderAttachmentChips();
  if (attachedFiles.length > 0) {
    setStatus(`${attachedFiles.length} file(s) attached.`);
  }
}

function buildUserMessage(text, attachments, model) {
  const textFiles = attachments.filter((file) => file.kind === "text");
  const imageFiles = attachments.filter((file) => file.kind === "image");

  let content = "";
  if (textFiles.length > 0) {
    const blocks = [];
    let totalChars = 0;

    for (const file of textFiles) {
      let fileText = file.text;
      const remaining = MAX_TEXT_CONTEXT_CHARS - totalChars;
      if (remaining <= 0) break;
      if (fileText.length > remaining) {
        fileText = `${fileText.slice(0, remaining)}\n\n[Truncated due to context limit]`;
      }
      totalChars += fileText.length;
      blocks.push(`--- File: ${file.name} ---\n${fileText}`);
    }

    content += `The user attached the following file(s) for context:\n\n${blocks.join("\n\n")}`;
  }

  if (text.trim()) {
    content += content ? `\n\nUser message:\n${text}` : text;
  } else if (!content && imageFiles.length > 0) {
    content = "Please analyze the attached image(s).";
  } else if (!content) {
    content = "Please analyze the attached file(s).";
  }

  const message = { role: "user", content };

  if (imageFiles.length > 0) {
    if (!modelSupportsVision(model)) {
      throw new Error(
        `${model} may not support images. Try qwen3.5:9b or another vision-capable model.`
      );
    }
    message.images = imageFiles.map((file) => file.base64);
  }

  return message;
}

function populateModelSelect(models) {
  modelSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = ALL_MODELS_VALUE;
  allOption.textContent = "all models";
  modelSelect.appendChild(allOption);

  for (const name of models) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    modelSelect.appendChild(option);
  }
}

async function loadModels() {
  try {
    const response = await fetch("/api/models");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load models");
    }

    modelCapabilities.clear();
    const models = (data.models || [])
      .map((item) => {
        modelCapabilities.set(item.name, item.capabilities || []);
        return item.name;
      })
      .filter((name) => !EXCLUDED_MODELS.has(name))
      .sort();

    availableModels = models;
    populateModelSelect(models);

    if (models.length === 0) {
      modelSelect.innerHTML = `<option value="">No models installed</option>`;
      setStatus("No models found. Run: ollama pull qwen3.5:9b", true);
      setComposerEnabled(false);
      return;
    }

    const preferred = models.find((name) => name.includes("qwen3.5:9b")) || models[0];
    const activeChat = getActiveChat();
    const savedModel = activeChat?.model;
    if (savedModel && [...modelSelect.options].some((opt) => opt.value === savedModel)) {
      modelSelect.value = savedModel;
    } else {
      modelSelect.value = preferred;
    }
    updateActiveModelHeader(modelSelect.value);
    setStatus(`Connected. ${models.length} model(s) available.`);
    setComposerEnabled(true);
  } catch (error) {
    modelSelect.innerHTML = `<option value="">Unavailable</option>`;
    setStatus(error.message, true);
    setComposerEnabled(false);
  }
}

async function streamToNode(model, messages, think, assistantNode) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      think,
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed with ${response.status}`);
  }

  const contentEl = assistantNode.querySelector(".content");
  let fullText = "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);

      if (chunk.message?.content) {
        assistantNode.classList.remove("thinking");
        fullText += chunk.message.content;
        contentEl.textContent = fullText;
      }

      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  return fullText;
}

async function streamChatForModel(chat, model, think, userMessage, assistantNode) {
  const conversation = getModelConversation(chat, model);
  conversation.push(userMessage);

  try {
    const reply = await streamToNode(model, conversation, think, assistantNode);
    conversation.push({ role: "assistant", content: reply });
    return { model, reply, error: null };
  } catch (error) {
    const message = `Error: ${error.message}`;
    assistantNode.classList.remove("thinking");
    assistantNode.querySelector(".content").textContent = message;
    return { model, reply: message, error };
  }
}

async function streamAllModels(chat, think, userMessage) {
  const models = getSelectableModels();
  const nodes = new Map();

  for (const model of models) {
    nodes.set(model, addMessage("assistant", "", [], "thinking", model));
  }

  setStatus(`querying ${models.length} models...`);

  const results = await Promise.all(
    models.map((model) => {
      let modelUserMessage = userMessage;
      try {
        if (userMessage.images?.length && !modelSupportsVision(model)) {
          throw new Error("model does not support images");
        }
      } catch (error) {
        const node = nodes.get(model);
        node.classList.remove("thinking");
        node.querySelector(".content").textContent = `Error: ${error.message}`;
        return Promise.resolve({ model, reply: `Error: ${error.message}`, error });
      }

      return streamChatForModel(chat, model, think, { ...modelUserMessage }, nodes.get(model));
    })
  );

  return results;
}

async function streamSingleModel(chat, model, think, userMessage) {
  const assistantNode = addMessage("assistant", "", [], "thinking", model);
  const result = await streamChatForModel(chat, model, think, userMessage, assistantNode);
  return result.reply;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  const model = modelSelect.value;
  const hasAttachments = attachedFiles.length > 0;

  if ((!text && !hasAttachments) || !model || isStreaming) return;

  let chat = getActiveChat();
  if (!chat) {
    chat = createPendingChat(model);
  }

  isStreaming = true;
  setComposerEnabled(false);

  const attachmentNames = attachedFiles.map((file) => file.name);
  const displayText = text || "(attached files only)";

  try {
    const modelsToQuery = isAllModelsMode(model) ? getSelectableModels() : [model];
    const referenceModel = isAllModelsMode(model)
      ? modelsToQuery.find((name) => modelSupportsVision(name)) || modelsToQuery[0]
      : model;
    const userMessage = buildUserMessage(text, attachedFiles, referenceModel);
    addMessage("user", displayText, attachmentNames);

    chat.uiMessages.push({
      role: "user",
      content: displayText,
      attachmentNames,
    });

    if (chat.title === "new chat") {
      chat.title = makeChatTitle(displayText);
    }

    chat.model = model;
    chat.think = thinkToggle.checked;
    commitChat(chat);

    messageInput.value = "";
    resetComposer();

    await saveChats();
    renderHistoryList();

    if (isAllModelsMode(model)) {
      const results = await streamAllModels(chat, thinkToggle.checked, userMessage);
      for (const result of results) {
        chat.uiMessages.push({
          role: "assistant",
          content: result.reply,
          modelName: result.model,
        });
      }
      touchChat(chat);
      setStatus(`all models · ${results.length} responses`);
    } else {
      const reply = await streamSingleModel(chat, model, thinkToggle.checked, userMessage);
      chat.uiMessages.push({
        role: "assistant",
        content: reply,
        modelName: model,
      });
      chat.conversation = getModelConversation(chat, model);
      touchChat(chat);
      setStatus(
        serverPersistenceCapable
          ? `saved to disk · ${chat.uiMessages.length} msgs`
          : `saved locally · ${chat.uiMessages.length} msgs`
      );
    }

    renderHistoryList();
    await saveChats();
  } catch (error) {
    addMessage("assistant", `Error: ${error.message}`, [], "", model);
    setStatus(error.message, true);
    await saveChats();
  } finally {
    isStreaming = false;
    setComposerEnabled(true);
    messageInput.focus();
  }
});

attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  if (!fileInput.files?.length) return;
  try {
    await processSelectedFiles(fileInput.files);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    fileInput.value = "";
  }
});

modelSelect.addEventListener("change", () => {
  updateActiveModelHeader(modelSelect.value);
  const chat = getActiveChat();
  if (chat) {
    chat.model = modelSelect.value;
    saveChats();
    renderHistoryList();
  }
});

thinkToggle.addEventListener("change", () => {
  const chat = getActiveChat();
  if (chat) {
    chat.think = thinkToggle.checked;
    saveChats();
  }
});

newChatBtn.addEventListener("click", startNewChat);

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

function updateServerStatusUI(mainRunning, controlRunning = false) {
  serverStatusDot.classList.toggle("online", mainRunning);
  serverStatusDot.classList.toggle("offline", !mainRunning);
  if (mainRunning) {
    serverStatusText.textContent = "online";
    serverStartBtn.title = "";
  } else if (controlRunning) {
    serverStatusText.textContent = "offline · click start";
    serverStartBtn.title = "Start chat server";
  } else {
    serverStatusText.textContent = "offline · run npm start";
    serverStartBtn.title = "Run in Terminal: npm run restart-and-test";
  }
  serverStartBtn.disabled = mainRunning;
  serverStopBtn.disabled = !mainRunning;
  serverRestartBtn.disabled = false;
}

async function pollServerStatus() {
  let mainRunning = false;
  let controlRunning = false;

  try {
    const statusResponse = await fetch("/api/control/status", { cache: "no-store" });
    if (statusResponse.ok) {
      const data = await statusResponse.json();
      controlRunning = Boolean(data.control?.running);
      mainRunning = Boolean(data.main?.running);
    }
  } catch {
    controlRunning = false;
  }

  if (!mainRunning) {
    try {
      const healthResponse = await fetch("/api/health", { cache: "no-store" });
      mainRunning = healthResponse.ok;
    } catch {
      mainRunning = false;
    }
  }

  updateServerStatusUI(mainRunning, controlRunning);
  return { main: { running: mainRunning }, control: { running: controlRunning } };
}

async function waitForMainServer(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch("/api/health");
      if (response.ok) return true;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function startChatServer() {
  serverStatusText.textContent = "starting...";
  serverStartBtn.disabled = true;

  let response;
  try {
    response = await fetch("/api/control/start", { method: "POST" });
  } catch {
    setStatus("supervisor offline — run: npm run restart-and-test", true);
    updateServerStatusUI(false, false);
    return;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    setStatus(`start failed (${response.status}) — check server.log`, true);
    console.error("start failed:", response.status, detail);
    updateServerStatusUI(false, false);
    return;
  }

  const ready = await waitForMainServer();
  if (ready) {
    window.location.reload();
  } else {
    setStatus("server start timed out", true);
    await pollServerStatus();
  }
}

async function stopChatServer() {
  serverStatusText.textContent = "stopping...";
  serverStopBtn.disabled = true;

  let stopped = false;
  try {
    const response = await fetch("/api/control/stop", { method: "POST" });
    stopped = response.ok;
  } catch {
    setStatus("could not stop server", true);
  }

  setTimeout(async () => {
    await pollServerStatus();
    setComposerEnabled(false);
    if (stopped) {
      setStatus("server stopped");
    }
  }, 800);
}

async function restartChatServer() {
  serverStatusText.textContent = "restarting...";
  serverRestartBtn.disabled = true;

  let restarted = false;
  try {
    const response = await fetch("/api/control/restart", { method: "POST" });
    restarted = response.ok;
  } catch (error) {
    setStatus(`restart failed: ${error.message}`, true);
    await pollServerStatus();
    return;
  }

  if (!restarted) {
    setStatus("restart failed", true);
    await pollServerStatus();
    return;
  }

  const ready = await waitForMainServer();
  if (ready) {
    window.location.reload();
  } else {
    setStatus("restart timed out", true);
    await pollServerStatus();
  }
}

serverStartBtn.addEventListener("click", startChatServer);
serverStopBtn.addEventListener("click", stopChatServer);
serverRestartBtn.addEventListener("click", restartChatServer);

async function init() {
  await pollServerStatus();
  serverPersistenceCapable = await checkServerPersistence();
  const restored = await loadChats();

  if (!restored) {
    createPendingChat();
    renderEmptyState();
  } else {
    const chat = getActiveChat() || chats[0];
    activeChatId = chat.id;
    applyChatSettings(chat);
    renderMessages(chat);
    setStatus(
      serverPersistenceCapable
        ? `restored from disk · ${getPersistedChats().length} chats`
        : `restored locally · ${getPersistedChats().length} chats`
    );
  }

  if (!serverPersistenceCapable) {
    showServerRestartHint();
  }

  renderHistoryList();
  await loadModels();
}

window.addEventListener("beforeunload", () => {
  const payload = mergePayloadForLocalSave(buildSavePayload());
  if (payload.chats.length === 0) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  if (serverPersistenceCapable) {
    navigator.sendBeacon(
      "/api/chats",
      new Blob([JSON.stringify(payload)], { type: "application/json" })
    );
  }
});

setInterval(() => {
  if (!isStreaming && getPersistedChats().length > 0) {
    saveChats();
  }
}, 15000);

setInterval(() => {
  pollServerStatus();
}, 5000);

setInterval(async () => {
  if (!serverPersistenceCapable) {
    serverPersistenceCapable = await checkServerPersistence();
    if (serverPersistenceCapable && getPersistedChats().length > 0) {
      await saveChatsToDisk(mergePayloadForLocalSave(buildSavePayload()));
    }
  }
}, 30000);

init();
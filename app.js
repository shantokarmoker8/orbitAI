/* ─── Config ─── */
const WEBHOOK_URL =
  "https://n8n.srv1106977.hstgr.cloud/webhook-test/c6171376-5a20-4514-8671-2ea679717665";
const STORAGE_KEY = "nexusai_chat_history";

/* ─── DOM Refs ─── */
const messagesContainer = document.getElementById("messagesContainer");
const welcomeScreen = document.getElementById("welcomeScreen");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");

/* ─── State ─── */
let chatHistory = [];
let isLoading = false;

/* ─── Init ─── */
loadHistory();
setupAutoResize();
setupKeyboardShortcut();

/* ──────────────────────────────────────────────
   CORE FUNCTIONS
────────────────────────────────────────────── */

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  // Hide welcome screen on first message
  if (welcomeScreen) welcomeScreen.style.display = "none";

  appendMessage("user", text);
  saveToHistory("user", text);

  userInput.value = "";
  resetTextareaHeight();
  setLoading(true);

  const typingEl = showTypingIndicator();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.reply?.trim() || "No response received.";

    removeTypingIndicator(typingEl);
    appendMessage("ai", reply);
    saveToHistory("ai", reply);
  } catch (err) {
    removeTypingIndicator(typingEl);
    const errMsg = err.message.includes("Failed to fetch")
      ? "Cannot reach the server. Check your connection or webhook URL."
      : `Error: ${err.message}`;
    appendMessage("ai", errMsg, true);
  } finally {
    setLoading(false);
  }
}

/* ──────────────────────────────────────────────
   UI HELPERS
────────────────────────────────────────────── */

function appendMessage(role, text, isError = false) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "ai" ? "ai-avatar" : "user-avatar"}`;
  avatar.textContent = role === "ai" ? "AI" : "U";

  const bubble = document.createElement("div");
  bubble.className = `bubble${isError ? " error-bubble" : ""}`;
  bubble.textContent = text;

  if (role === "ai") {
    row.appendChild(avatar);
    row.appendChild(bubble);
  } else {
    row.appendChild(bubble);
    row.appendChild(avatar);
  }

  messagesContainer.appendChild(row);
  scrollToBottom();
}

function showTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row ai";
  row.id = "typingRow";

  const avatar = document.createElement("div");
  avatar.className = "avatar ai-avatar";
  avatar.textContent = "AI";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.innerHTML = `
    <span>AI is typing</span>
    <div class="typing-dots">
      <i></i><i></i><i></i>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(indicator);
  messagesContainer.appendChild(row);
  scrollToBottom();

  return row;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function setLoading(state) {
  isLoading = state;
  sendBtn.disabled = state;
  userInput.disabled = state;
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* ──────────────────────────────────────────────
   LOCAL STORAGE
────────────────────────────────────────────── */

function saveToHistory(role, text) {
  chatHistory.push({ role, text, ts: Date.now() });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  } catch (e) {
    console.warn("localStorage write failed:", e);
  }
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    chatHistory = JSON.parse(stored);
    if (!chatHistory.length) return;

    // Hide welcome screen if history exists
    if (welcomeScreen) welcomeScreen.style.display = "none";

    chatHistory.forEach(({ role, text }) => appendMessage(role, text));
  } catch (e) {
    console.warn("Failed to load history:", e);
    chatHistory = [];
  }
}

function clearHistory() {
  chatHistory = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("localStorage clear failed:", e);
  }
}

/* ──────────────────────────────────────────────
   INPUT HELPERS
────────────────────────────────────────────── */

function setupAutoResize() {
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 160)}px`;
  });
}

function resetTextareaHeight() {
  userInput.style.height = "auto";
}

function setupKeyboardShortcut() {
  userInput.addEventListener("keydown", (e) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

/* ──────────────────────────────────────────────
   EVENT LISTENERS
────────────────────────────────────────────── */

sendBtn.addEventListener("click", sendMessage);

newChatBtn.addEventListener("click", () => {
  // Clear UI
  messagesContainer.innerHTML = "";

  // Re-add welcome screen
  const ws = document.createElement("div");
  ws.id = "welcomeScreen";
  ws.className = "welcome-screen";
  ws.innerHTML = `
    <div class="welcome-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" fill="#6C63FF22" stroke="#6C63FF" stroke-width="1.5"/>
        <path d="M16 24h16M24 16v16" stroke="#6C63FF" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    </div>
    <h2>How can I help you today?</h2>
    <p>Start a conversation below.</p>
  `;
  messagesContainer.appendChild(ws);

  clearHistory();
  userInput.value = "";
  resetTextareaHeight();
  userInput.focus();
});

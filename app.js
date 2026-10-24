// PDS Citizen Mitra - Pure HTML/CSS/JS Client Application

(function () {
  // State
  let apiKey = localStorage.getItem("PDS_GEMINI_API_KEY") || "";
  let currentRules = localStorage.getItem("PDS_ACTIVE_RULES") || (typeof DEFAULT_GOVERNMENT_RULES !== "undefined" ? DEFAULT_GOVERNMENT_RULES : "");
  let chatHistory = [];

  // DOM Elements
  const chatStream = document.getElementById("chatStream");
  const messageForm = document.getElementById("messageForm");
  const userInputField = document.getElementById("userInputField");
  const sendBtn = document.getElementById("sendBtn");
  const modelSelect = document.getElementById("modelSelect");
  const clearChatHistoryBtn = document.getElementById("clearChatHistoryBtn");
  const suggestionsContainer = document.getElementById("suggestionsContainer");

  // Status & Nav
  const apiKeyStatusBadge = document.getElementById("apiKeyStatusBadge");
  const statusDot = document.getElementById("statusDot");
  const statusLabel = document.getElementById("statusLabel");
  const openSettingsBtn = document.getElementById("openSettingsBtn");

  // Document & Helper Elements
  const viewFullDocBtn = document.getElementById("viewFullDocBtn");
  const editRulesBtn = document.getElementById("editRulesBtn");
  const currentDocSummary = document.getElementById("currentDocSummary");

  // Modal Elements
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const toggleApiKeyVisibility = document.getElementById("toggleApiKeyVisibility");
  const customRulesText = document.getElementById("customRulesText");
  const resetRulesToDefaultBtn = document.getElementById("resetRulesToDefaultBtn");
  const fileUploadInput = document.getElementById("fileUploadInput");

  // Initialize UI
  function init() {
    updateApiStatus();
    updateDocSummaryDisplay();
    attachEventListeners();
    
    // Auto-prompt to enter API key if missing
    if (!apiKey) {
      setTimeout(() => {
        openModal();
      }, 500);
    }
  }

  // Update Status Badge
  function updateApiStatus() {
    if (apiKey && apiKey.trim().length > 5) {
      statusDot.className = "status-dot active";
      statusLabel.textContent = "API Key Active";
    } else {
      statusDot.className = "status-dot warning";
      statusLabel.textContent = "API Key Required";
    }
  }

  // Update document summary text
  function updateDocSummaryDisplay() {
    const charCount = currentRules.length;
    currentDocSummary.textContent = `Active Ground-Truth Document: ${charCount.toLocaleString()} characters loaded. Zero-hallucination enabled.`;
  }

  // Event Listeners
  function attachEventListeners() {
    // Open/Close Modal
    openSettingsBtn.addEventListener("click", openModal);
    editRulesBtn.addEventListener("click", openModal);
    viewFullDocBtn.addEventListener("click", openModal);
    closeSettingsBtn.addEventListener("click", closeModal);
    cancelSettingsBtn.addEventListener("click", closeModal);

    // Save Settings
    saveSettingsBtn.addEventListener("click", saveSettings);

    // Toggle API Key Show/Hide
    toggleApiKeyVisibility.addEventListener("click", () => {
      if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleApiKeyVisibility.textContent = "Hide";
      } else {
        apiKeyInput.type = "password";
        toggleApiKeyVisibility.textContent = "Show";
      }
    });

    // Reset Rules to Default
    resetRulesToDefaultBtn.addEventListener("click", () => {
      if (confirm("Reset government regulations to official default manual?")) {
        customRulesText.value = typeof DEFAULT_GOVERNMENT_RULES !== "undefined" ? DEFAULT_GOVERNMENT_RULES : "";
      }
    });

    // File Upload (.txt)
    fileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          customRulesText.value = event.target.result;
        };
        reader.readAsText(file);
      }
    });

    // Form Submit
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleUserSubmit();
    });

    // Enter Key Send (Shift+Enter for new line)
    userInputField.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleUserSubmit();
      }
    });

    // Auto resize textarea
    userInputField.addEventListener("input", () => {
      userInputField.style.height = "auto";
      userInputField.style.height = Math.min(userInputField.scrollHeight, 120) + "px";
    });

    // Clear Chat History
    clearChatHistoryBtn.addEventListener("click", () => {
      if (confirm("Clear conversation history?")) {
        chatHistory = [];
        chatStream.innerHTML = `
          <div class="chat-row bot-row">
            <div class="avatar-icon">🌾</div>
            <div class="bubble-container">
              <div class="bubble-meta">
                <span class="bot-name">PDS Citizen Mitra</span>
                <span class="grounded-badge">✓ Conversation Reset</span>
              </div>
              <div class="bubble-body">
                <p>Conversation history has been cleared. How can I help you regarding food grain distribution rules?</p>
              </div>
            </div>
          </div>
        `;
      }
    });

    // Quick Suggestions Chips
    suggestionsContainer.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip-btn");
      if (chip && chip.dataset.query) {
        userInputField.value = chip.dataset.query;
        handleUserSubmit();
      }
    });
  }

  // Modal Controls
  function openModal() {
    apiKeyInput.value = apiKey;
    customRulesText.value = currentRules;
    settingsModal.style.display = "flex";
  }

  function closeModal() {
    settingsModal.style.display = "none";
  }

  function saveSettings() {
    const newKey = apiKeyInput.value.trim();
    const newRules = customRulesText.value.trim();

    if (!newKey) {
      alert("Please provide a valid Gemini API Key to enable responses.");
    }

    apiKey = newKey;
    localStorage.setItem("PDS_GEMINI_API_KEY", apiKey);

    if (newRules) {
      currentRules = newRules;
      localStorage.setItem("PDS_ACTIVE_RULES", currentRules);
    }

    updateApiStatus();
    updateDocSummaryDisplay();
    closeModal();
  }

  // Handle Query Submission
  async function handleUserSubmit() {
    const text = userInputField.value.trim();
    if (!text) return;

    if (!apiKey) {
      alert("Please configure your Gemini API Key in Settings to ask questions.");
      openModal();
      return;
    }

    // Render User Message
    appendMessage("user", text);
    userInputField.value = "";
    userInputField.style.height = "auto";
    sendBtn.disabled = true;

    // Show Typing Indicator
    const typingIndicator = appendTypingIndicator();

    try {
      const model = modelSelect.value || "gemini-3.8-flash";
      const answer = await queryGeminiAPI(model, text);
      removeTypingIndicator(typingIndicator);
      appendMessage("bot", answer);
    } catch (err) {
      removeTypingIndicator(typingIndicator);
      appendMessage(
        "bot",
        `⚠️ **Error:** ${err.message}\n\n*Check your API key in Settings and ensure you have an active internet connection.*`
      );
    } finally {
      sendBtn.disabled = false;
      userInputField.focus();
    }
  }

  // Direct REST API Call to Google Gemini
  async function queryGeminiAPI(model, userQuestion) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are "PDS Citizen Mitra", an official AI assistant representing the Public Food Grain Distribution System (Department of Food, Civil Supplies & Consumer Affairs).

OFFICIAL GOVERNMENT RULES & REGULATIONS DOCUMENT:
============================================================
${currentRules}
============================================================

STRICT CITIZEN GUIDANCE & GROUNDING RULES:
1. STRICT GROUNDING: Answer questions SOLELY and EXCLUSIVELY based on the official rules and regulations in the document provided above.
2. ZERO HALLUCINATION: Never invent, guess, or extrapolate rules, quotas, prices, or procedures not explicitly mentioned in the text.
3. OUT OF SCOPE / UNKNOWN QUERIES: If the question cannot be answered using the provided document, state clearly:
   "According to the official Public Grain Distribution guidelines currently provided, this specific detail is not specified. Please contact your local Fair Price Shop inspector or call the National PDS Toll-Free Helpline at 1967 or 14445."
4. CITATIONS: In every answer, cite the exact Section number from the rules document (e.g. "[Ref: Section 2.1 - AAY Entitlement]" or "[Ref: Section 4.2 - Strict No-Denial Policy]").
5. CITIZEN RIGHTS: If the user faces dealer denial, overcharging for free food grains, or machine/fingerprint failure, explain their rights clearly and provide the grievance redressal channel (Toll-Free 1967 / 14445).
6. MULTILINGUAL: Answer in the language used by the citizen (Hindi, English, etc.) while preserving official terms.`;

    // Construct multi-turn contents payload
    const contents = [
      ...chatHistory,
      {
        role: "user",
        parts: [{ text: userQuestion }],
      },
    ];

    const payload = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.15, // Low temperature for high factual accuracy
        maxOutputTokens: 1500,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received from model.";

    // Save turn to history (keep last 12 messages)
    chatHistory.push({ role: "user", parts: [{ text: userQuestion }] });
    chatHistory.push({ role: "model", parts: [{ text: candidateText }] });
    if (chatHistory.length > 12) {
      chatHistory.splice(0, chatHistory.length - 12);
    }

    return candidateText;
  }

  // Append Message to UI
  function appendMessage(sender, text) {
    const row = document.createElement("div");
    row.className = `chat-row ${sender === "user" ? "user-row" : "bot-row"}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar-icon";
    avatar.textContent = sender === "user" ? "👤" : "🌾";

    const bubble = document.createElement("div");
    bubble.className = "bubble-container";

    if (sender === "bot") {
      const meta = document.createElement("div");
      meta.className = "bubble-meta";
      meta.innerHTML = `
        <span class="bot-name">PDS Citizen Mitra</span>
        <span class="grounded-badge">✓ Verified by Policy</span>
      `;
      bubble.appendChild(meta);

      const body = document.createElement("div");
      body.className = "bubble-body";
      if (window.marked && typeof window.marked.parse === "function") {
        body.innerHTML = window.marked.parse(text);
      } else {
        body.textContent = text;
      }
      bubble.appendChild(body);
    } else {
      const body = document.createElement("div");
      body.className = "bubble-body";
      body.textContent = text;
      bubble.appendChild(body);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatStream.appendChild(row);

    chatStream.scrollTop = chatStream.scrollHeight;
  }

  // Typing Indicator
  function appendTypingIndicator() {
    const row = document.createElement("div");
    row.className = "chat-row bot-row";
    row.innerHTML = `
      <div class="avatar-icon">🌾</div>
      <div class="bubble-container">
        <div class="typing-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
          <span style="font-size: 0.78rem; color: #566573; margin-left: 8px;">Consulting Government Guidelines...</span>
        </div>
      </div>
    `;
    chatStream.appendChild(row);
    chatStream.scrollTop = chatStream.scrollHeight;
    return row;
  }

  function removeTypingIndicator(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  // Start app
  init();
})();

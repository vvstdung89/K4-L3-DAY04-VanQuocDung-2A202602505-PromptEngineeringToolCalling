(() => {
  const chatLog = document.getElementById("chat-log");
  const chatEmpty = document.getElementById("chat-empty");
  const composer = document.getElementById("composer");
  const input = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const resetBtn = document.getElementById("reset-btn");
  const transcriptIdEl = document.getElementById("transcript-id");

  const tabChat = document.getElementById("tab-chat");
  const tabTranscripts = document.getElementById("tab-transcripts");
  const panelChat = document.getElementById("panel-chat");
  const panelTranscripts = document.getElementById("panel-transcripts");
  const transcriptsList = document.getElementById("transcripts-list");
  const transcriptsView = document.getElementById("transcripts-view");

  const tplTurn = document.getElementById("tpl-turn");
  const tplRound = document.getElementById("tpl-round");
  const tplCall = document.getElementById("tpl-call");

  function pretty(value) {
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }

  function resultHasError(result) {
    return Boolean(result && typeof result === "object" && "error" in result);
  }

  function renderRounds(container, rounds) {
    container.innerHTML = "";
    (rounds || []).forEach((round) => {
      const node = tplRound.content.cloneNode(true);
      node.querySelector("[data-round-num]").textContent = round.round;
      const callsEl = node.querySelector("[data-calls]");
      (round.tool_calls || []).forEach((call, i) => {
        const event = (round.tool_results || [])[i];
        const callNode = tplCall.content.cloneNode(true);
        callNode.querySelector("[data-tool-name]").textContent = call.name;
        const flag = callNode.querySelector("[data-result-flag]");
        const hasError = event ? resultHasError(event.result) : false;
        flag.dataset.value = hasError ? "error" : "ok";
        flag.textContent = hasError ? "error" : "ok";
        callNode.querySelector("[data-args]").textContent = pretty(call.args);
        callNode.querySelector("[data-result]").textContent = event
          ? pretty(event.result)
          : "(no result recorded)";
        callsEl.appendChild(callNode);
      });
      container.appendChild(node);
    });
  }

  function renderTurn(turnRecord, container) {
    const node = tplTurn.content.cloneNode(true);
    const article = node.querySelector(".turn");
    article.querySelector(".user-text").textContent = turnRecord.user;
    article.querySelector(".assistant-text").textContent =
      turnRecord.assistant_text || (turnRecord.error ? turnRecord.error : "");
    const pill = article.querySelector("[data-status]");
    pill.dataset.value = turnRecord.status;
    pill.textContent = turnRecord.status;
    renderRounds(article.querySelector("[data-trace]"), turnRecord.rounds);
    container.appendChild(article);
    return article;
  }

  function autosize() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }

  input.addEventListener("input", autosize);

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    chatEmpty.remove();
    input.value = "";
    autosize();
    sendBtn.disabled = true;

    const placeholder = renderTurn(
      {
        user: message,
        status: "running",
        assistant_text: "Thinking...",
        rounds: [],
      },
      chatLog
    );
    chatLog.scrollTop = chatLog.scrollHeight;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const turnRecord = await res.json();
      if (!res.ok) {
        throw new Error(turnRecord.error || "request_failed");
      }
      placeholder.remove();
      renderTurn(turnRecord, chatLog);
    } catch (err) {
      placeholder.remove();
      renderTurn(
        {
          user: message,
          status: "provider_error",
          assistant_text: `Request failed: ${err.message}`,
          rounds: [],
        },
        chatLog
      );
    } finally {
      sendBtn.disabled = false;
      chatLog.scrollTop = chatLog.scrollHeight;
      input.focus();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  resetBtn.addEventListener("click", async () => {
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    transcriptIdEl.textContent = data.transcript_id;
    chatLog.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p>New conversation started.</p><p class=\"muted\">Send a message to begin.</p>";
    chatLog.appendChild(empty);
  });

  function switchTab(target) {
    const showChat = target === "chat";
    panelChat.classList.toggle("is-hidden", !showChat);
    panelTranscripts.classList.toggle("is-hidden", showChat);
    tabChat.classList.toggle("is-active", showChat);
    tabTranscripts.classList.toggle("is-active", !showChat);
    tabChat.setAttribute("aria-selected", String(showChat));
    tabTranscripts.setAttribute("aria-selected", String(!showChat));
    if (!showChat) loadTranscripts();
  }

  tabChat.addEventListener("click", () => switchTab("chat"));
  tabTranscripts.addEventListener("click", () => switchTab("transcripts"));

  async function loadTranscripts() {
    transcriptsList.innerHTML = "";
    const res = await fetch("/api/transcripts");
    const items = await res.json();
    if (!items.length) {
      transcriptsList.innerHTML =
        '<div class="empty-state"><p class="muted">No saved transcripts yet.</p></div>';
      return;
    }
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "transcript-item";
      btn.type = "button";
      btn.innerHTML = `${item.version || "?"} &middot; ${item.provider || "?"} &middot; ${item.turn_count} turns
        <span class="transcript-item-id">${item.name}</span>`;
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".transcript-item")
          .forEach((el) => el.classList.remove("is-active"));
        btn.classList.add("is-active");
        loadTranscriptDetail(item.name);
      });
      transcriptsList.appendChild(btn);
    });
  }

  async function loadTranscriptDetail(name) {
    transcriptsView.innerHTML = '<div class="empty-state"><p class="muted">Loading...</p></div>';
    const res = await fetch(`/api/transcripts/${encodeURIComponent(name)}`);
    const data = await res.json();
    transcriptsView.innerHTML = "";
    if (!data.turns || !data.turns.length) {
      transcriptsView.innerHTML =
        '<div class="empty-state"><p class="muted">This transcript has no turns.</p></div>';
      return;
    }
    data.turns.forEach((turn) => renderTurn(turn, transcriptsView));
  }

  autosize();
})();

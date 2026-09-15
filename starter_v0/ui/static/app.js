(() => {
  const chatLog = document.getElementById("chat-log");
  const composer = document.getElementById("composer");
  const input = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const resetBtn = document.getElementById("reset-btn");
  const transcriptIdEl = document.getElementById("transcript-id");
  const versionInput = document.getElementById("version-input");
  const versionApplyBtn = document.getElementById("version-apply-btn");
  const artifactVersionBadge = document.getElementById("artifact-version-badge");

  const tabChat = document.getElementById("tab-chat");
  const tabTestcases = document.getElementById("tab-testcases");
  const tabTranscripts = document.getElementById("tab-transcripts");
  const panelChat = document.getElementById("panel-chat");
  const panelTestcases = document.getElementById("panel-testcases");
  const panelTranscripts = document.getElementById("panel-transcripts");
  const transcriptsList = document.getElementById("transcripts-list");
  const transcriptsView = document.getElementById("transcripts-view");
  const testcasesList = document.getElementById("testcases-list");
  const testcasesSearch = document.getElementById("testcases-search");
  const testcasesFilters = document.getElementById("testcases-filters");

  const tplTurn = document.getElementById("tpl-turn");
  const tplRound = document.getElementById("tpl-round");
  const tplCall = document.getElementById("tpl-call");
  const tplTestcase = document.getElementById("tpl-testcase");

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

  async function sendMessage(message) {
    if (!message) return;
    const currentEmpty = document.getElementById("chat-empty");
    if (currentEmpty) currentEmpty.remove();
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
      return turnRecord;
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
      return null;
    } finally {
      sendBtn.disabled = false;
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    input.value = "";
    autosize();
    await sendMessage(message);
    input.focus();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  function applySessionMeta(data, emptyMessage) {
    transcriptIdEl.textContent = data.transcript_id;
    artifactVersionBadge.textContent = data.artifact_version;
    versionInput.value = data.artifact_version.split("+")[0];
    chatLog.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.id = "chat-empty";
    empty.innerHTML = emptyMessage;
    chatLog.appendChild(empty);
  }

  resetBtn.addEventListener("click", async () => {
    const res = await fetch("/api/reset", { method: "POST" });
    const data = await res.json();
    applySessionMeta(data, "<p>New conversation started.</p><p class=\"muted\">Send a message to begin.</p>");
  });

  versionApplyBtn.addEventListener("click", async () => {
    const version = versionInput.value.trim();
    if (!version) return;
    versionApplyBtn.disabled = true;
    try {
      const res = await fetch("/api/version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "request_failed");
      applySessionMeta(
        data,
        `<p>Switched to <strong>${data.artifact_version}</strong>.</p><p class="muted">system_prompt.md/tools.yaml were re-read from disk.</p>`
      );
    } catch (err) {
      artifactVersionBadge.textContent = `error: ${err.message}`;
    } finally {
      versionApplyBtn.disabled = false;
    }
  });

  function switchTab(target) {
    panelChat.classList.toggle("is-hidden", target !== "chat");
    panelTestcases.classList.toggle("is-hidden", target !== "testcases");
    panelTranscripts.classList.toggle("is-hidden", target !== "transcripts");
    tabChat.classList.toggle("is-active", target === "chat");
    tabTestcases.classList.toggle("is-active", target === "testcases");
    tabTranscripts.classList.toggle("is-active", target === "transcripts");
    tabChat.setAttribute("aria-selected", String(target === "chat"));
    tabTestcases.setAttribute("aria-selected", String(target === "testcases"));
    tabTranscripts.setAttribute("aria-selected", String(target === "transcripts"));
    if (target === "transcripts") loadTranscripts();
    if (target === "testcases" && !testcasesList.dataset.loaded) loadTestcases();
  }

  tabChat.addEventListener("click", () => switchTab("chat"));
  tabTestcases.addEventListener("click", () => switchTab("testcases"));
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

  let allTestcases = [];
  let activeSuite = null;

  function suiteLabel(suite) {
    return suite || "other";
  }

  function renderTestcaseFilters() {
    const suites = [...new Set(allTestcases.map((c) => suiteLabel(c.suite)))].sort();
    testcasesFilters.innerHTML = "";
    const makeChip = (value, label) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (activeSuite === value ? " is-active" : "");
      chip.textContent = label;
      chip.addEventListener("click", () => {
        activeSuite = activeSuite === value ? null : value;
        renderTestcaseFilters();
        renderTestcaseList();
      });
      testcasesFilters.appendChild(chip);
    };
    makeChip(null, "All");
    suites.forEach((suite) => makeChip(suite, suite));
  }

  function renderTestcaseList() {
    const query = testcasesSearch.value.trim().toLowerCase();
    testcasesList.innerHTML = "";
    const filtered = allTestcases.filter((c) => {
      if (activeSuite && suiteLabel(c.suite) !== activeSuite) return false;
      if (!query) return true;
      const haystack = `${c.id} ${c.query || ""} ${(c.turns || []).map((t) => t.content).join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });

    if (!filtered.length) {
      testcasesList.innerHTML = '<div class="empty-state"><p class="muted">No matching test cases.</p></div>';
      return;
    }

    filtered.forEach((testcase) => {
      const node = tplTestcase.content.cloneNode(true);
      node.querySelector("[data-id]").textContent = testcase.id;
      node.querySelector("[data-suite]").textContent = suiteLabel(testcase.suite);
      if (testcase.is_multiturn) {
        const turns = testcase.turns || [];
        node.querySelector("[data-query]").textContent = `${turns.length} turns: "${turns[0]?.content || ""}"...`;
      } else {
        node.querySelector("[data-query]").textContent = testcase.query || "";
      }
      node.querySelector("[data-what]").textContent = testcase.what_it_tests || "";
      const runBtn = node.querySelector("[data-run]");
      runBtn.textContent = testcase.is_multiturn ? "Run all turns" : "Run";
      runBtn.addEventListener("click", async () => {
        runBtn.disabled = true;
        switchTab("chat");
        if (testcase.is_multiturn) {
          for (const turn of testcase.turns || []) {
            await sendMessage(turn.content);
          }
        } else {
          await sendMessage(testcase.query);
        }
        runBtn.disabled = false;
      });
      testcasesList.appendChild(node);
    });
  }

  async function loadTestcases() {
    testcasesList.innerHTML = '<div class="empty-state"><p class="muted">Loading test cases...</p></div>';
    const res = await fetch("/api/testcases");
    allTestcases = await res.json();
    testcasesList.dataset.loaded = "true";
    renderTestcaseFilters();
    renderTestcaseList();
  }

  testcasesSearch.addEventListener("input", renderTestcaseList);

  autosize();
})();

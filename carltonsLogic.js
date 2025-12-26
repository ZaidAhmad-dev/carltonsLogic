(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  // ✅ OPTION B PATHS
  const BROADEN_URL = "./BIG11/CARLTON.html";
  const ESSAY_URL   = "./BIG11/CARLTON.html";   // change later if you want
  const QUIZ_URL    = "./carltonsLogic2/LOGIC.html";

  /* ================= PAYWALL + 1 MONTH EXPIRY ================= */

  // ================= COUNTRY PRICING (US + EUROPE = $15, everyone else = $7) =================
  const PRICE_USD_US_EU = "15.00";
  const PRICE_USD_OTHER = "7.00";

  // Active price used everywhere (UI + PayPal createOrder)
  let ACTIVE_PRICE_USD = PRICE_USD_US_EU;
  let ACTIVE_COUNTRY = null;

  // Europe country codes (broad list: EU/EEA + UK/CH + microstates)
  const EUROPE_COUNTRIES = new Set([
    "AL","AD","AT","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FO","FR","GB","GE","GI","GR","HR","HU","IE","IM",
    "IS","IT","JE","LI","LT","LU","LV","MC","MD","ME","MK","MT","NL","NO","PL","PT","RO","RS","RU","SE","SI","SK","SM","TR","UA",
    "VA","XK"
  ]);

  function getActivePriceUSD(){
    return ACTIVE_PRICE_USD;
  }

  function isEurope(code){
    return !!code && EUROPE_COUNTRIES.has(String(code).toUpperCase());
  }

  async function detectCountryCode(){
    // Uses IP-based geo lookup. If it fails, we default to $15.
    try{
      const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
      if (!res.ok) throw new Error("geo http " + res.status);
      const data = await res.json();
      const code = data && (data.country_code || data.country);
      return code ? String(code).toUpperCase() : null;
    } catch (e){
      return null;
    }
  }

  let pricingInitPromise = null;
  function ensurePricingInit(){
    if (pricingInitPromise) return pricingInitPromise;

    pricingInitPromise = (async () => {
      const code = await detectCountryCode();
      ACTIVE_COUNTRY = code;

      const isTier15 = (code === "US") || isEurope(code);
      ACTIVE_PRICE_USD = isTier15 ? PRICE_USD_US_EU : PRICE_USD_OTHER;

      // Update any visible price text
      setButtonState();
      updatePriceTextBlocks();
    })();

    return pricingInitPromise;
  }

  function updatePriceTextBlocks(){
    const pricingTitleEl = $("pricingTitle");
    const paywallPriceEl = $("paywallPrice");

    if (pricingTitleEl){
      pricingTitleEl.textContent = `$${getActivePriceUSD()} / month`;
    }
    if (paywallPriceEl){
      paywallPriceEl.textContent = `$${getActivePriceUSD()}`;
    }
  }
  const ACCESS_MONTHS = 1;

  const PAID_KEY         = "quiz_paid_v1";
  const PAID_CAPTURE_KEY = "quiz_paid_capture_v1";
  const PAID_ORDER_KEY   = "quiz_paid_order_v1";
  const PAID_AT_KEY      = "quiz_paid_at_v1";

  function clearPaid(){
    localStorage.removeItem(PAID_KEY);
    localStorage.removeItem(PAID_CAPTURE_KEY);
    localStorage.removeItem(PAID_ORDER_KEY);
    localStorage.removeItem(PAID_AT_KEY);
  }

  function getExpiryMs(){
    const paidAtRaw = localStorage.getItem(PAID_AT_KEY);
    const paidAt = paidAtRaw ? parseInt(paidAtRaw, 10) : 0;
    if (!paidAt || Number.isNaN(paidAt)) return 0;

    const exp = new Date(paidAt);
    exp.setMonth(exp.getMonth() + ACCESS_MONTHS); // ✅ true “month”
    return exp.getTime();
  }

  function isPaid(){
    const paidFlag = localStorage.getItem(PAID_KEY) === "1";
    const captureOk = !!localStorage.getItem(PAID_CAPTURE_KEY);
    const expMs = getExpiryMs();

    if (!(paidFlag && captureOk && expMs)) return false;

    if (Date.now() >= expMs){
      clearPaid();
      return false;
    }
    return true;
  }

  function unlockQuiz({ orderId, captureId } = {}){
    localStorage.setItem(PAID_KEY, "1");
    localStorage.setItem(PAID_ORDER_KEY, orderId || "");
    localStorage.setItem(PAID_CAPTURE_KEY, captureId || "");
    localStorage.setItem(PAID_AT_KEY, String(Date.now())); // ✅ starts 1 month
    setButtonState();
  }

  /* ================= BUTTONS ================= */
  const startQuizBtn = $("startQuizBtn");
  const broadenBtn = $("broadenBtn");
  const essayBtn = $("essayBtn");
  const pricingPayBtn = $("pricingPayBtn");
  const pricingGoTopBtn = $("pricingGoTopBtn");

  const accessStatus = $("accessStatus");
  const pricingStatusText = $("pricingStatusText");

  const paywallEl = $("paywall");
  const paywallClose = $("paywallClose");

  // Detect visitor country and set price ($15 for US+Europe, $7 elsewhere)
  ensurePricingInit();

  // after paying, send user to whichever button they clicked
  let postPayTarget = null;

  function formatExpiry(expMs){
    const expDate = new Date(expMs);
    return expDate.toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" });
  }

  function daysLeft(expMs){
    const ms = expMs - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  function setButtonState(){
    const paid = isPaid();
    const expMs = getExpiryMs();

    // keep visible prices synced
    updatePriceTextBlocks();

    if (startQuizBtn){
      startQuizBtn.textContent = paid
        ? `Start Quiz (expires ${formatExpiry(expMs)})`
        : `Pay to Start ($${getActivePriceUSD()}/month)`;
    }

    if (broadenBtn){
      broadenBtn.textContent = paid ? "Broaden Your Intellect" : "🔒 Pay to Unlock";
    }

    if (essayBtn){
      essayBtn.textContent = paid ? "Writing your Essay" : "🔒 Pay to Unlock";
    }

    if (accessStatus){
      if (paid){
        accessStatus.textContent = `Unlocked • ${daysLeft(expMs)} day(s) left • Expires ${formatExpiry(expMs)}`;
      } else {
        accessStatus.textContent = `Locked • $${getActivePriceUSD()}/month`;
      }
    }

    if (pricingStatusText){
      if (paid){
        pricingStatusText.textContent = `Status: Unlocked • Expires ${formatExpiry(expMs)} • ${daysLeft(expMs)} day(s) left.`;
      } else {
        pricingStatusText.textContent = "Status: Locked • Pay to unlock.";
      }
    }
  }

  function goTo(url){ window.location.href = url; }

  function openPaywall(){
    if (!paywallEl) return;
    paywallEl.classList.add("open");
    paywallEl.setAttribute("aria-hidden","false");
    ensurePricingInit().finally(() => {
      setTimeout(() => renderPayPalButtons("paypalButtonsModal"), 50);
    });
  }

  function closePaywall(){
    if (!paywallEl) return;
    paywallEl.classList.remove("open");
    paywallEl.setAttribute("aria-hidden","true");
  }

  paywallClose?.addEventListener("click", closePaywall);
  paywallEl?.addEventListener("click", (e) => { if (e.target === paywallEl) closePaywall(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePaywall(); });

  /* ================= LOCK GATE ================= */
  function gateTo(url){
    if (isPaid()){
      goTo(url);
      return;
    }
    postPayTarget = url;
    openPaywall();
  }

  startQuizBtn?.addEventListener("click", () => gateTo(QUIZ_URL));
  broadenBtn?.addEventListener("click",  () => gateTo(BROADEN_URL));
  essayBtn?.addEventListener("click",    () => gateTo(ESSAY_URL));

  pricingPayBtn?.addEventListener("click", () => gateTo(QUIZ_URL));
  pricingGoTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ================= PayPal Buttons ================= */
  const renderedTargets = new Set();

  function showPayPalNotLoaded(host){
    host.innerHTML =
      '<div style="opacity:.85;color:var(--muted);font-size:.85rem;line-height:1.2;">' +
      'PayPal SDK not loaded. Don’t run from <b>file://</b> — use Live Server / localhost.' +
      "</div>";
  }

  function renderPayPalButtons(targetId){
    const host = $(targetId);
    if (!host) return;
    if (renderedTargets.has(targetId)) return;

    host.innerHTML = "";
    if (!window.paypal || typeof window.paypal.Buttons !== "function"){
      showPayPalNotLoaded(host);
      return;
    }

    renderedTargets.add(targetId);

    window.paypal.Buttons({
      style: { layout: "vertical" },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: getActivePriceUSD() },
            description: "1 Month Access"
          }]
        });
      },
      onApprove: (data, actions) => {
        return actions.order.capture().then((details) => {
          unlockQuiz({
            orderId: data?.orderID,
            captureId: details?.id
          });
          closePaywall();
          goTo(postPayTarget || QUIZ_URL);
        });
      },
      onError: (err) => {
        console.error("PayPal error:", err);
        host.innerHTML =
          '<div style="opacity:.9;color:#fecaca;font-size:.85rem;line-height:1.2;">' +
          "PayPal error. Open Console (F12) to see details." +
          "</div>";
      }
    }).render(host);
  }

  function tryRenderInlineWithRetry(){
    const host = $("paypalButtonsInline");
    if (!host) return;

    let tries = 0;
    const maxTries = 30;
    const t = setInterval(() => {
      tries++;
      if (window.paypal && typeof window.paypal.Buttons === "function"){
        clearInterval(t);
        renderPayPalButtons("paypalButtonsInline");
      } else {
        if (!host.innerHTML.trim()) showPayPalNotLoaded(host);
        if (tries >= maxTries) clearInterval(t);
      }
    }, 400);
  }

  // ✅ keep state correct even if month expires while tab is open
  setButtonState();
  tryRenderInlineWithRetry();
  setInterval(setButtonState, 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) setButtonState();
  });

  /* ================= 3D dice ================= */
  const diceRow1El = $("diceRow1");
  const diceRow2El = $("diceRow2");
  function rand(min, max){ return Math.random() * (max - min) + min; }

  function makeCubeWrap(letter, i){
    const wrap = document.createElement("div");
    wrap.className = "cube-wrap";
    wrap.style.setProperty("--rx", rand(-14, 10).toFixed(2));
    wrap.style.setProperty("--ry", rand(-18, 18).toFixed(2));
    wrap.style.setProperty("--rz", rand(-6, 6).toFixed(2));

    const cube = document.createElement("div");
    cube.className = "cube " + ((i % 2 === 0) ? "purple" : "white");
    cube.style.setProperty("--i", String(i));

    const faces = ["front","back","right","left","top","bottom"];
    for (const cls of faces){
      const face = document.createElement("div");
      face.className = "face " + cls;
      const sp = document.createElement("span");
      sp.textContent = letter;
      face.appendChild(sp);
      cube.appendChild(face);
    }
    wrap.appendChild(cube);
    return wrap;
  }

  function renderDiceRow(text, hostEl, startIndex){
    if (!hostEl) return startIndex || 0;
    hostEl.innerHTML = "";
    let idx = startIndex || 0;
    for (const ch of String(text || "")){
      if (ch === " "){
        const gap = document.createElement("div");
        gap.className = "dice-gap";
        hostEl.appendChild(gap);
        continue;
      }
      hostEl.appendChild(makeCubeWrap(ch.toUpperCase(), idx));
      idx++;
    }
    return idx;
  }

  let next = 0;
  next = renderDiceRow("CARLTONS", diceRow1El, next);
  renderDiceRow("LOGIC", diceRow2El, next);

  /* ================= Clock ================= */
  const clockEl = $("clockDisplay");
  function updateClock(){
    const now = new Date();
    if (clockEl){
      clockEl.textContent = now.toLocaleTimeString([], {
        hour:"2-digit", minute:"2-digit", second:"2-digit"
      });
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  /* ================= Timer ================= */
  const timerLabelEl = $("timerLabel");
  const timerDisplayEl = $("timerDisplay");
  const modeStopwatchBtn = $("timerModeStopwatch");
  const modeCountdownBtn = $("timerModeCountdown");
  const countdownInputsEl = $("countdownInputs");
  const countdownMinutesEl = $("countdownMinutes");
  const countdownSecondsEl = $("countdownSeconds");
  const startPauseBtn = $("timerStartPause");
  const resetBtn = $("timerReset");

  let timerMode = "stopwatch";
  let running = false;
  let swStartMs = 0;
  let swElapsedMs = 0;
  let cdRemaining = 0;
  let tickHandle = null;

  function pad2(n){ return String(n).padStart(2,"0"); }
  function formatSeconds(totalSeconds){
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
    return `${pad2(m)}:${pad2(sec)}`;
  }
  function formatStopwatch(ms){
    const totalSeconds = Math.floor(ms / 1000);
    return formatSeconds(totalSeconds);
  }
  function renderTimerButtons(){
    modeStopwatchBtn?.classList.toggle("timer-mode-active", timerMode === "stopwatch");
    modeCountdownBtn?.classList.toggle("timer-mode-active", timerMode === "countdown");
    if (countdownInputsEl) countdownInputsEl.style.display = (timerMode === "countdown") ? "flex" : "none";
    if (timerLabelEl) timerLabelEl.textContent = (timerMode === "countdown") ? "Countdown" : "Stopwatch";
    if (startPauseBtn) startPauseBtn.textContent = running ? "Pause" : "Start";
  }
  function stopTick(){
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = null;
  }
  function startTick(){
    stopTick();
    tickHandle = setInterval(() => {
      if (!running || !timerDisplayEl) return;

      if (timerMode === "stopwatch"){
        const now = Date.now();
        const elapsed = swElapsedMs + (now - swStartMs);
        timerDisplayEl.textContent = formatStopwatch(elapsed);
      } else {
        cdRemaining -= 1;
        timerDisplayEl.textContent = formatSeconds(cdRemaining);
        if (cdRemaining <= 0){
          cdRemaining = 0;
          running = false;
          stopTick();
          if (startPauseBtn) startPauseBtn.textContent = "Start";
          try { navigator.vibrate?.(200); } catch(_) {}
          alert("Countdown done!");
        }
      }
    }, 1000);
  }
  function setMode(newMode){
    if (timerMode === newMode) return;
    running = false;
    stopTick();
    if (startPauseBtn) startPauseBtn.textContent = "Start";

    if (newMode === "stopwatch"){
      swElapsedMs = 0;
      if (timerDisplayEl) timerDisplayEl.textContent = formatStopwatch(0);
    } else {
      const mins = Math.max(0, parseInt((countdownMinutesEl?.value || "0"), 10));
      const secs = Math.max(0, parseInt((countdownSecondsEl?.value || "0"), 10));
      cdRemaining = (mins * 60) + Math.min(secs, 59);
      if (timerDisplayEl) timerDisplayEl.textContent = formatSeconds(cdRemaining);
    }
    timerMode = newMode;
    renderTimerButtons();
  }

  modeStopwatchBtn?.addEventListener("click", () => setMode("stopwatch"));
  modeCountdownBtn?.addEventListener("click", () => setMode("countdown"));

  startPauseBtn?.addEventListener("click", () => {
    if (!timerDisplayEl) return;

    if (!running){
      if (timerMode === "stopwatch"){
        swStartMs = Date.now();
      } else {
        const mins = Math.max(0, parseInt((countdownMinutesEl?.value || "0"), 10));
        const secs = Math.max(0, parseInt((countdownSecondsEl?.value || "0"), 10));
        const startSeconds = (mins * 60) + Math.min(secs, 59);
        if (cdRemaining <= 0) cdRemaining = startSeconds;
        if (cdRemaining <= 0){
          alert("Enter minutes/seconds first.");
          return;
        }
        timerDisplayEl.textContent = formatSeconds(cdRemaining);
      }
      running = true;
      startPauseBtn.textContent = "Pause";
      startTick();
    } else {
      running = false;
      if (timerMode === "stopwatch"){
        swElapsedMs = swElapsedMs + (Date.now() - swStartMs);
      }
      startPauseBtn.textContent = "Start";
    }
  });

  resetBtn?.addEventListener("click", () => {
    running = false;
    stopTick();
    if (startPauseBtn) startPauseBtn.textContent = "Start";

    if (timerMode === "stopwatch"){
      swElapsedMs = 0;
      if (timerDisplayEl) timerDisplayEl.textContent = formatStopwatch(0);
    } else {
      const mins = Math.max(0, parseInt((countdownMinutesEl?.value || "0"), 10));
      const secs = Math.max(0, parseInt((countdownSecondsEl?.value || "0"), 10));
      cdRemaining = (mins * 60) + Math.min(secs, 59);
      if (timerDisplayEl) timerDisplayEl.textContent = formatSeconds(cdRemaining);
    }
  });

  function updateCountdownPreview(){
    if (timerMode !== "countdown" || running || !timerDisplayEl) return;
    const mins = Math.max(0, parseInt((countdownMinutesEl?.value || "0"), 10));
    const secs = Math.max(0, parseInt((countdownSecondsEl?.value || "0"), 10));
    cdRemaining = (mins * 60) + Math.min(secs, 59);
    timerDisplayEl.textContent = formatSeconds(cdRemaining);
  }
  countdownMinutesEl?.addEventListener("input", updateCountdownPreview);
  countdownSecondsEl?.addEventListener("input", updateCountdownPreview);

  renderTimerButtons();
  setMode("stopwatch");

  /* ================= Calendar + notes ================= */
  const calTitleEl = $("calTitle");
  const calGridEl = $("calGrid");
  const calSelectedEl = $("calSelectedLabel");
  const calPrevBtn = $("calPrev");
  const calNextBtn = $("calNext");

  const dayNames = ["S","M","T","W","T","F","S"];

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  function sameYMD(a,b){
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }

  const NOTES_KEY = "calendar_sticky_notes_v1";
  const notesPopoverEl = $("notesPopover");
  const notesCloseEl = $("notesClose");
  const notesDateLabelEl = $("notesDateLabel");
  const noteTextEl = $("noteText");
  const addNoteBtn = $("addNoteBtn");
  const clearNotesBtn = $("clearNotesBtn");
  const notesListEl = $("notesList");
  const notesCountEl = $("notesCount");

  let notesByDate = {};
  let notesOpen = false;

  function safeParse(s){ try { return JSON.parse(s); } catch { return null; } }
  function loadNotes(){
    const raw = localStorage.getItem(NOTES_KEY);
    const data = safeParse(raw || "");
    notesByDate = (data && typeof data === "object") ? data : {};
  }
  function saveNotes(){ localStorage.setItem(NOTES_KEY, JSON.stringify(notesByDate)); }
  function dateKey(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }
  function fmtTime(iso){
    try {
      const dt = new Date(iso);
      return dt.toLocaleString([], {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"});
    } catch { return iso || ""; }
  }
  function getNotesForSelected(){
    const k = dateKey(selectedDate);
    const arr = notesByDate[k];
    return Array.isArray(arr) ? arr : [];
  }

  function openNotes(){
    notesOpen = true;
    notesPopoverEl?.classList.add("open");
    notesPopoverEl?.setAttribute("aria-hidden", "false");
    renderNotes();
    noteTextEl?.focus();
  }
  function closeNotes(){
    notesOpen = false;
    notesPopoverEl?.classList.remove("open");
    notesPopoverEl?.setAttribute("aria-hidden", "true");
    if (noteTextEl) noteTextEl.value = "";
    renderCalendar();
  }

  notesCloseEl?.addEventListener("click", closeNotes);
  document.addEventListener("mousedown", (e) => {
    if (!notesOpen) return;
    const calCard = $("calendarCard");
    if (calCard && !calCard.contains(e.target)) closeNotes();
  });

  function renderNotes(){
    if (!notesDateLabelEl || !notesListEl || !notesCountEl) return;
    notesDateLabelEl.textContent = selectedDate.toLocaleDateString([], {
      weekday:"short", month:"short", day:"numeric", year:"numeric"
    });

    const list = getNotesForSelected();
    notesListEl.innerHTML = "";
    notesCountEl.textContent = String(list.length);

    if (!list.length){
      notesListEl.innerHTML = `<div style="opacity:.75;color:var(--muted);font-size:.8rem;">No sticky notes for this day.</div>`;
      return;
    }

    list.forEach((n, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "sticky";
      wrap.innerHTML = `
        <div class="sticky-top">
          <div class="sticky-num">#${idx + 1}</div>
          <div class="sticky-time">${fmtTime(n.atIso)}</div>
        </div>
        <div class="sticky-text"></div>
        <div class="sticky-actions">
          <button class="mini-btn" data-edit="1" type="button">Edit</button>
          <button class="mini-btn danger" data-del="1" type="button">Delete</button>
        </div>
      `;
      wrap.querySelector(".sticky-text").textContent = (n.text || "").toString();

      wrap.querySelector("[data-del='1']").addEventListener("click", () => {
        const k = dateKey(selectedDate);
        notesByDate[k] = getNotesForSelected().filter(x => x.id !== n.id);
        if (!notesByDate[k].length) delete notesByDate[k];
        saveNotes();
        renderCalendar();
        renderNotes();
      });

      wrap.querySelector("[data-edit='1']").addEventListener("click", () => {
        const newText = prompt("Edit note:", (n.text || "").toString());
        if (newText === null) return;
        const trimmed = newText.trim();
        if (!trimmed) return;

        const k = dateKey(selectedDate);
        notesByDate[k] = getNotesForSelected().map(x => x.id === n.id ? { ...x, text: trimmed } : x);
        saveNotes();
        renderNotes();
      });

      notesListEl.appendChild(wrap);
    });
  }

  function addNote(){
    const text = (noteTextEl?.value || "").trim();
    if (!text) return;

    const k = dateKey(selectedDate);
    const arr = getNotesForSelected();
    arr.unshift({
      id: "n_" + Math.random().toString(36).slice(2) + "_" + Date.now(),
      text,
      atIso: new Date().toISOString()
    });
    notesByDate[k] = arr;
    if (noteTextEl) noteTextEl.value = "";
    saveNotes();
    renderCalendar();
    renderNotes();
  }

  addNoteBtn?.addEventListener("click", addNote);
  noteTextEl?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") addNote();
  });

  clearNotesBtn?.addEventListener("click", () => {
    const k = dateKey(selectedDate);
    if (!getNotesForSelected().length) return;
    if (!confirm("Clear ALL sticky notes for this day?")) return;
    delete notesByDate[k];
    saveNotes();
    renderCalendar();
    renderNotes();
  });

  function renderCalendar(){
    if (!calTitleEl || !calGridEl) return;

    const titleDate = new Date(viewYear, viewMonth, 1);
    calTitleEl.textContent = titleDate.toLocaleDateString([], {month:"long", year:"numeric"});
    calGridEl.innerHTML = "";

    for (const dn of dayNames){
      const el = document.createElement("div");
      el.className = "mini-cal-day-name";
      el.textContent = dn;
      calGridEl.appendChild(el);
    }

    const first = new Date(viewYear, viewMonth, 1);
    const firstDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i=0; i<firstDay; i++){
      const blank = document.createElement("div");
      blank.className = "mini-cal-day empty";
      blank.textContent = "";
      calGridEl.appendChild(blank);
    }

    for (let d=1; d<=daysInMonth; d++){
      const dateObj = new Date(viewYear, viewMonth, d);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mini-cal-day";

      const span = document.createElement("span");
      span.className = "day-num";
      span.textContent = String(d);
      btn.appendChild(span);

      if (sameYMD(dateObj, today)) btn.classList.add("today");
      if (sameYMD(dateObj, selectedDate)) btn.classList.add("selected");

      const k = dateKey(dateObj);
      const hasNotes = Array.isArray(notesByDate[k]) && notesByDate[k].length > 0;
      if (hasNotes) btn.classList.add("has-notes");

      btn.addEventListener("click", () => {
        selectedDate = dateObj;

        if (calSelectedEl){
          calSelectedEl.textContent = "Selected: " + selectedDate.toLocaleDateString([], {
            weekday:"short", month:"short", day:"numeric", year:"numeric"
          });
        }

        openNotes();
        renderCalendar();
      });

      calGridEl.appendChild(btn);
    }
  }

  calPrevBtn?.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0){ viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });

  calNextBtn?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11){ viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });

  loadNotes();
  renderCalendar();
})();

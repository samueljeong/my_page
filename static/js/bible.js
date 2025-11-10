// static/js/bible.js
document.addEventListener("DOMContentLoaded", () => {
  // ===== 요소 =====
  const monthInput = document.getElementById("dateMonth");
  const dayInput = document.getElementById("dateDay");
  const weekdaySpan = document.getElementById("dateWeekday");

  const verseInput = document.getElementById("verse");
  const verseText = document.getElementById("verseText");

  const btnMorning = document.getElementById("btnMakeMorning");
  const btnEvening = document.getElementById("btnMakeEvening");

  const morningBox = document.getElementById("morningMessage");
  const eveningBox = document.getElementById("eveningMessage");

  const toggleGuides = document.getElementById("toggleGuides");
  const guidelineContent = document.getElementById("guidelineContent");
  const guideMorning = document.getElementById("guideMorning");
  const guideEvening = document.getElementById("guideEvening");
  const guideImgPrompt = document.getElementById("guideImgPrompt");
  const btnSaveGuides = document.getElementById("btnSaveGuides");
  const guideSaveStatus = document.getElementById("guideSaveStatus");
  const gTabs = document.querySelectorAll(".g-tab");

  const btnCopyMorning = document.getElementById("btnCopyMorning");
  const btnCopyEvening = document.getElementById("btnCopyEvening");

  const btnGenMorningImg = document.getElementById("btnGenMorningImg");
  const btnGenEveningImg = document.getElementById("btnGenEveningImg");
  const morningImgBox = document.getElementById("morningImgBox");
  const eveningImgBox = document.getElementById("eveningImgBox");
  const morningImgPrompts = document.getElementById("morningImgPrompts");
  const eveningImgPrompts = document.getElementById("eveningImgPrompts");
  const morningMusic = document.getElementById("morningMusic");
  const eveningMusic = document.getElementById("eveningMusic");
  const btnCopyMorningMusic = document.getElementById("btnCopyMorningMusic");
  const btnCopyEveningMusic = document.getElementById("btnCopyEveningMusic");

  const loadingBar = document.getElementById("loadingBar");

  // ===== 공통 유틸 =====
  function showLoading() {
    if (loadingBar) loadingBar.classList.remove("hidden");
  }
  function hideLoading() {
    if (loadingBar) loadingBar.classList.add("hidden");
  }

  // textarea 자동 높이
  function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // 페이지 로드 시 한 번, 입력 때마다 한 번
  document.querySelectorAll("textarea.auto-resize").forEach((el) => {
    autoResize(el);
    el.addEventListener("input", () => autoResize(el));
  });

  // ===== 날짜 =====
  const LS_DATE_KEY = "bible-date";

  function updateWeekday(month, day) {
    const now = new Date();
    const year = now.getFullYear();
    const local = new Date(
      new Date(`${year}-${month}-${day}T00:00:00+09:00`).toLocaleString("en-US", {
        timeZone: "Asia/Seoul",
      })
    );
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const w = weekdays[local.getDay()];
    if (weekdaySpan) weekdaySpan.textContent = `(${w})`;
  }

  function loadDate() {
    if (!monthInput || !dayInput) return;
    const saved = localStorage.getItem(LS_DATE_KEY);
    if (saved) {
      const { month, day } = JSON.parse(saved);
      monthInput.value = month;
      dayInput.value = day;
      updateWeekday(month, day);
    } else {
      const now = new Date();
      monthInput.value = now.getMonth() + 1;
      dayInput.value = now.getDate();
      updateWeekday(monthInput.value, dayInput.value);
    }
  }

  function saveDate() {
    if (!monthInput || !dayInput) return;
    const month = Number(monthInput.value);
    const day = Number(dayInput.value);
    localStorage.setItem(LS_DATE_KEY, JSON.stringify({ month, day }));
    updateWeekday(month, day);
  }

  if (monthInput) monthInput.addEventListener("change", saveDate);
  if (dayInput) dayInput.addEventListener("change", saveDate);
  loadDate();

  // ===== 지침 열고 닫기 =====
  if (toggleGuides && guidelineContent) {
    guidelineContent.classList.add("hidden");
    toggleGuides.addEventListener("click", () => {
      guidelineContent.classList.toggle("hidden");
    });
  }

  // ===== 지침 탭 =====
  if (gTabs && gTabs.length) {
    gTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        gTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const type = tab.dataset.g;
        if (type === "morning") {
          guideMorning.classList.remove("hidden");
          guideEvening.classList.add("hidden");
          guideImgPrompt.classList.add("hidden");
          autoResize(guideMorning);
        } else if (type === "evening") {
          guideMorning.classList.add("hidden");
          guideEvening.classList.remove("hidden");
          guideImgPrompt.classList.add("hidden");
          autoResize(guideEvening);
        } else {
          guideMorning.classList.add("hidden");
          guideEvening.classList.add("hidden");
          guideImgPrompt.classList.remove("hidden");
          autoResize(guideImgPrompt);
        }
      });
    });
  }

  // ===== 서버에서 지침 불러오기 =====
  async function loadGuidesFromServer() {
    try {
      const res = await fetch("/api/guides");
      const data = await res.json();
      const bible = data.bible || {};
      if (guideMorning) {
        guideMorning.value = bible.morning || "";
        autoResize(guideMorning);
      }
      if (guideEvening) {
        guideEvening.value = bible.evening || "";
        autoResize(guideEvening);
      }
      if (guideImgPrompt) {
        guideImgPrompt.value = bible.image_prompt || "";
        autoResize(guideImgPrompt);
      }
    } catch (e) {
      console.warn("지침 불러오기 실패", e);
    }
  }
  loadGuidesFromServer();

  // ===== 지침 저장 =====
  if (btnSaveGuides) {
    btnSaveGuides.addEventListener("click", async () => {
      const payload = {
        bible: {
          morning: guideMorning ? guideMorning.value : "",
          evening: guideEvening ? guideEvening.value : "",
          image_prompt: guideImgPrompt ? guideImgPrompt.value : "",
        },
      };
      await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (guideSaveStatus) {
        guideSaveStatus.textContent = "✅ 저장됨";
        setTimeout(() => (guideSaveStatus.textContent = ""), 2000);
      }
    });
  }

  // ===== 메시지 생성 =====
  async function makeMessage(type) {
    const verse = verseInput ? verseInput.value : "";
    const text = verseText ? verseText.value : "";
    const dateInfo = monthInput
      ? `${monthInput.value}월 ${dayInput.value}일 ${weekdaySpan ? weekdaySpan.textContent : ""}`
      : "";
    const prompt = `날짜: ${dateInfo}\n본문: ${verse}\n본문 내용: ${text}\n`;

    showLoading();
    const res = await fetch("/api/bible", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        page: "bible",
        msg_type: type,
      }),
    });
    const data = await res.json();
    hideLoading();
    return data.reply || "";
  }

  if (btnMorning) {
    btnMorning.addEventListener("click", async () => {
      const msg = await makeMessage("morning");
      if (morningBox) {
        morningBox.value = msg;
        autoResize(morningBox);
      }
      localStorage.setItem("bible-morning-msg", msg);
    });
  }

  if (btnEvening) {
    btnEvening.addEventListener("click", async () => {
      const msg = await makeMessage("evening");
      if (eveningBox) {
        eveningBox.value = msg;
        autoResize(eveningBox);
      }
      localStorage.setItem("bible-evening-msg", msg);
    });
  }

  // ===== 로컬 메시지 복원 =====
  (function restoreMessages() {
    const m = localStorage.getItem("bible-morning-msg");
    const e = localStorage.getItem("bible-evening-msg");
    if (m && morningBox) {
      morningBox.value = m;
      autoResize(morningBox);
    }
    if (e && eveningBox) {
      eveningBox.value = e;
      autoResize(eveningBox);
    }
  })();

  // ===== 복사 버튼 =====
  if (btnCopyMorning && morningBox) {
    btnCopyMorning.addEventListener("click", () => {
      const text = morningBox.value || "";
      if (!text.trim()) return;
      navigator.clipboard.writeText(text);
    });
  }
  if (btnCopyEvening && eveningBox) {
    btnCopyEvening.addEventListener("click", () => {
      const text = eveningBox.value || "";
      if (!text.trim()) return;
      navigator.clipboard.writeText(text);
    });
  }

  // ===== 이미지 프롬프트 =====
  async function askImagePromptsFromServer(messageText, when) {
    showLoading();
    const res = await fetch("/api/image-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageText,
        when: when,
      }),
    });
    const data = await res.json();
    hideLoading();
    return data.prompts || [];
  }

  function renderImgPrompts(container, shots) {
    if (!container) return;
    container.innerHTML = "";
    shots.forEach((shot) => {
      const box = document.createElement("div");
      box.className = "imgfx-item";
      box.innerHTML = `
        <label>한글</label>
        <textarea class="auto-resize no-resize">${shot.ko || ""}</textarea>
        <label>영문</label>
        <div class="copy-row">
          <textarea class="auto-resize no-resize imgfx-en">${shot.en || ""}</textarea>
          <button class="copy-btn">복사</button>
        </div>
      `;
      container.appendChild(box);

      box.querySelectorAll("textarea").forEach((ta) => {
        autoResize(ta);
        ta.addEventListener("input", () => autoResize(ta));
      });

      const copyBtn = box.querySelector(".copy-btn");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(shot.en || "");
      });
    });
  }

  if (btnGenMorningImg) {
    btnGenMorningImg.addEventListener("click", async () => {
      const text = morningBox ? morningBox.value : "";
      const shots = await askImagePromptsFromServer(text, "morning");
      renderImgPrompts(morningImgPrompts, shots);
      if (morningMusic) {
        morningMusic.value =
          "calm orchestral worship background, soft piano, morning devotion, 70bpm, cinematic, high quality";
        autoResize(morningMusic);
      }
      if (morningImgBox) morningImgBox.classList.remove("hidden");
    });
  }

  if (btnGenEveningImg) {
    btnGenEveningImg.addEventListener("click", async () => {
      const text = eveningBox ? eveningBox.value : "";
      const shots = await askImagePromptsFromServer(text, "evening");
      renderImgPrompts(eveningImgPrompts, shots);
      if (eveningMusic) {
        eveningMusic.value =
          "warm ambient worship pad, gentle strings, evening prayer, 60bpm, cinematic, high quality";
        autoResize(eveningMusic);
      }
      if (eveningImgBox) eveningImgBox.classList.remove("hidden");
    });
  }

  // ===== 음악 프롬프트 복사 =====
  if (btnCopyMorningMusic && morningMusic) {
    btnCopyMorningMusic.addEventListener("click", () => {
      if (!morningMusic.value.trim()) return;
      navigator.clipboard.writeText(morningMusic.value);
    });
  }
  if (btnCopyEveningMusic && eveningMusic) {
    btnCopyEveningMusic.addEventListener("click", () => {
      if (!eveningMusic.value.trim()) return;
      navigator.clipboard.writeText(eveningMusic.value);
    });
  }
});

// static/js/visit.js
document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("visitName");
  const typeInput = document.getElementById("visitType");
  const reasonInput = document.getElementById("visitReason");

  const btnSuggest = document.getElementById("btnSuggest");
  const suggestList = document.getElementById("suggestList");

  const btnGuideToggle = document.getElementById("btnGuideToggle");
  const guideArea = document.getElementById("guideArea");
  const guideTabs = document.querySelectorAll(".g-tab");
  const guideText = document.getElementById("guideText");
  const btnGuideSave = document.getElementById("btnGuideSave");
  const guideSaveStatus = document.getElementById("guideSaveStatus");

  const sermonBox = document.getElementById("visitSermon");
  const btnSaveVisit = document.getElementById("btnSaveVisit");
  const saveVisitStatus = document.getElementById("saveVisitStatus");
  const recordsBox = document.getElementById("visitRecords");

  const loadingBar = document.getElementById("loadingBar");

  function showLoading() {
    if (loadingBar) loadingBar.classList.remove("hidden");
  }
  function hideLoading() {
    if (loadingBar) loadingBar.classList.add("hidden");
  }

  function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }
  document.querySelectorAll(".auto-resize").forEach((el) => {
    el.addEventListener("input", () => autoResize(el));
    autoResize(el);
  });

  // ---------------- 지침 열고닫기 ----------------
  if (btnGuideToggle && guideArea) {
    btnGuideToggle.addEventListener("click", () => {
      guideArea.classList.toggle("hidden");
    });
  }

  // ---------------- 지침 탭 ----------------
  let currentGuideKey = "default";
  if (guideTabs && guideTabs.length) {
    guideTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        guideTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentGuideKey = tab.dataset.g;
        loadGuides(); // 탭 바꿀 때마다 해당 지침 불러오기
      });
    });
  }

  // ---------------- 서버에서 지침 불러오기 ----------------
  async function loadGuides() {
    try {
      const res = await fetch("/api/guides");
      const data = await res.json();
      const visitGuides = data.visit || {};
      if (guideText) {
        guideText.value = visitGuides[currentGuideKey] || "";
        autoResize(guideText);
      }
    } catch (e) {
      console.warn("visit guide load fail", e);
    }
  }
  loadGuides();

  // ---------------- 지침 저장 ----------------
  if (btnGuideSave) {
    btnGuideSave.addEventListener("click", async () => {
      const payload = {
        visit: {
          [currentGuideKey]: guideText ? guideText.value || "" : "",
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

  // ---------------- 본문 추천 받기 ----------------
  if (btnSuggest) {
    btnSuggest.addEventListener("click", async () => {
      const payload = {
        name: nameInput ? nameInput.value : "",
        visit_type: typeInput ? typeInput.value : "",
        reason: reasonInput ? reasonInput.value : "",
        // 🔥 여기 추가: 현재 열려있는 지침도 같이 보냄
        guide: guideText ? guideText.value : "",
      };

      showLoading();
      const res = await fetch("/api/visit/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      hideLoading();

      const suggestions = data.suggestions || [];
      if (!suggestList) return;

      if (!suggestions.length) {
        suggestList.innerHTML =
          "<p>추천이 없습니다. 내용을 좀 더 자세히 적어주세요.</p>";
        return;
      }

      // 화면에 뿌리기
      suggestList.innerHTML = "";
      suggestions.forEach((sug, idx) => {
        const div = document.createElement("div");
        div.className = "suggest-item";
        div.innerHTML = `
          <h4>${sug.reference || "본문 제안 " + (idx + 1)}</h4>
          <p>${sug.summary || ""}</p>
          <button class="btn btn-choose"
                  data-ref="${sug.reference || ""}"
                  data-summary="${sug.summary || ""}">
            이 본문으로 설교문 작성
          </button>
        `;
        suggestList.appendChild(div);
      });

      // 각 버튼에 이벤트
      suggestList.querySelectorAll(".btn-choose").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const ref = btn.dataset.ref;
          const summary = btn.dataset.summary;
          showLoading();
          const res2 = await fetch("/api/visit/make-sermon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: nameInput ? nameInput.value : "",
              visit_type: typeInput ? typeInput.value : "",
              reason: reasonInput ? reasonInput.value : "",
              reference: ref,
              summary: summary,
              // 🔥 여기도 추가: 설교문 만들 때도 지침 적용
              guide: guideText ? guideText.value : "",
            }),
          });
          const data2 = await res2.json();
          hideLoading();
          if (sermonBox) {
            sermonBox.value = data2.sermon || "";
            autoResize(sermonBox);
          }
        });
      });
    });
  }

  // ---------------- 저장된 기록 불러오기 ----------------
  async function loadRecords() {
    try {
      const res = await fetch("/api/visit/records");
      const data = await res.json();
      if (!recordsBox) return;
      recordsBox.innerHTML = "";
      (data.records || []).forEach((rec) => {
        const btn = document.createElement("button");
        btn.textContent = `${rec.date} ${rec.name} ${rec.visit_type} ${rec.reference}`;
        btn.addEventListener("click", () => {
          if (sermonBox) {
            sermonBox.value = rec.sermon || "";
            autoResize(sermonBox);
          }
        });
        recordsBox.appendChild(btn);
      });
    } catch (e) {
      console.warn("visit records load fail", e);
    }
  }
  loadRecords();

  // ---------------- 설교문 저장 ----------------
  if (btnSaveVisit) {
    btnSaveVisit.addEventListener("click", async () => {
      const payload = {
        name: nameInput ? nameInput.value : "",
        visit_type: typeInput ? typeInput.value : "",
        reason: reasonInput ? reasonInput.value : "",
        sermon: sermonBox ? sermonBox.value : "",
      };
      const res = await fetch("/api/visit/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await res.json();
      if (saveVisitStatus) {
        saveVisitStatus.textContent = "✅ 저장됨";
        setTimeout(() => (saveVisitStatus.textContent = ""), 2000);
      }
      loadRecords();
    });
  }
});
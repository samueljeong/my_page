// static/js/sermon.js
document.addEventListener("DOMContentLoaded", () => {
  // ===== 요소 =====
  const selCategory = document.getElementById("sermonCategory");
  const inTitle = document.getElementById("sermonTitle");
  const inVerse = document.getElementById("sermonVerse");
  const inPassage = document.getElementById("sermonPassage");

  const btnAnalyze = document.getElementById("btnAnalyze");
  const loadingBar = document.getElementById("loadingBar");

  const taBg = document.getElementById("analysisBackground");
  const taTextual = document.getElementById("analysisTextual");

  const btnToggleGuides = document.getElementById("btnToggleGuides");
  const guideWrap = document.getElementById("guideWrap");
  const guideTabs = document.querySelectorAll(".g-tab");
  const guideAnalysis = document.getElementById("guideAnalysis");
  const guideSermon = document.getElementById("guideSermon");
  const guideDiscussion = document.getElementById("guideDiscussion");
  const btnSaveGuides = document.getElementById("btnSaveGuides");
  const guideSaveStatus = document.getElementById("guideSaveStatus");

  const btnMakeSermonPrompt = document.getElementById("btnMakeSermonPrompt");
  const taSermonPrompt = document.getElementById("sermonPrompt");
  const btnCopySermonPrompt = document.getElementById("btnCopySermonPrompt");

  // 나눔지 관련
  const youthInput = document.getElementById("youthInput");
  const taSermonRaw = document.getElementById("sermonRawText");
  const btnMakeDiscussion = document.getElementById("btnMakeDiscussion");
  const discussionBox = document.getElementById("discussionBox");
  const taDiscussionOut = document.getElementById("discussionOutput");
  const btnCopyDiscussion = document.getElementById("btnCopyDiscussion");

  // ===== 유틸 =====
  function autoResize(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }
  document.querySelectorAll("textarea.auto-resize").forEach((el) => {
    el.addEventListener("input", () => autoResize(el));
    autoResize(el);
  });

  function showLoading() {
    if (loadingBar) loadingBar.classList.add("show");
  }
  function hideLoading() {
    if (loadingBar) loadingBar.classList.remove("show");
  }

  // ===== 카테고리 따라 나눔지 영역 on/off =====
 function updateYouthVisibility() {
  const v = selCategory.value;
  const isYouth = v === "청년부" || v === "청소년부";

  if (isYouth) {
    youthInput.classList.remove("hidden");
    discussionBox.classList.remove("hidden");
  } else {
    youthInput.classList.add("hidden");fetch("/api/visit/make-sermon", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    visit_type,
    reason,
    reference,
    summary,
    guide: document.getElementById("visitGuide").value || ""
  })
})
    discussionBox.classList.add("hidden");   // ← 이 줄 추가
    taDiscussionOut.value = "";              // 필요하면 내용도 비워주기
  }
}
  selCategory.addEventListener("change", updateYouthVisibility);
  updateYouthVisibility();

  // ===== 지침 열기 =====
  btnToggleGuides.addEventListener("click", () => {
    guideWrap.classList.toggle("hidden");
  });

  // 탭 전환
  guideTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      guideTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const g = tab.dataset.g;
      guideAnalysis.classList.add("hidden");
      guideSermon.classList.add("hidden");
      guideDiscussion.classList.add("hidden");
      if (g === "analysis") guideAnalysis.classList.remove("hidden");
      if (g === "sermon") guideSermon.classList.remove("hidden");
      if (g === "discussion") guideDiscussion.classList.remove("hidden");
      autoResize(guideAnalysis);
      autoResize(guideSermon);
      autoResize(guideDiscussion);
    });
  });

  // ===== 지침 불러오기 =====
  async function loadGuides() {
    try {
      const res = await fetch("/api/guides");
      const data = await res.json();
      // 분석 지침
      if (guideAnalysis) {
        guideAnalysis.value = (data.sermon_analysis && data.sermon_analysis.default) || "";
        autoResize(guideAnalysis);
      }
      // 설교 지침
      if (guideSermon) {
        guideSermon.value = (data.sermon && data.sermon.default) || "";
        autoResize(guideSermon);
      }
      // 나눔지 지침
      if (guideDiscussion) {
        // 카테고리에 맞는 값 가져오기
        const cat = selCategory.value;
        const d = data.sermon_discussion || {};
        guideDiscussion.value = d[cat] || d.default || "";
        autoResize(guideDiscussion);
      }
    } catch (e) {
      console.warn("지침 불러오기 실패", e);
    }
  }
  loadGuides();

  // ===== 지침 저장 =====
  btnSaveGuides.addEventListener("click", async () => {
    const cat = selCategory.value;
    const payload = {
      sermon_analysis: {
        default: guideAnalysis.value || "",
      },
      sermon: {
        default: guideSermon.value || "",
      },
      sermon_discussion: {
        [cat]: guideDiscussion.value || "",
      },
    };
    await fetch("/api/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    guideSaveStatus.textContent = "✅ 저장됨";
    setTimeout(() => (guideSaveStatus.textContent = ""), 2000);
  });

  // ===== 본문 분석 =====
  btnAnalyze.addEventListener("click", async () => {
    showLoading();
    const res = await fetch("/api/sermon/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: selCategory.value,
        verse: inVerse.value,
        passage: inPassage.value,
        analysis_guide: guideAnalysis.value,
      }),
    });
    const data = await res.json();
    hideLoading();
    taBg.value = data.background || "";
    taTextual.value = data.textual || "";
    autoResize(taBg);
    autoResize(taTextual);

    // 분석에서 제목을 얻었다면 제목 넣어주기
    if (!inTitle.value && data.title) {
      inTitle.value = data.title;
    }
  });

  // ===== 설교문 프롬포트 작성 =====
  btnMakeSermonPrompt.addEventListener("click", async () => {
    showLoading();
    const res = await fetch("/api/sermon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: selCategory.value,
        verse: inVerse.value,
        passage: inPassage.value,
        title: inTitle.value,
        background: taBg.value,
        textual: taTextual.value,
        guide: guideSermon.value,
      }),
    });
    const data = await res.json();
    hideLoading();
    taSermonPrompt.value = data.prompt || "";
    autoResize(taSermonPrompt);
  });

  btnCopySermonPrompt.addEventListener("click", () => {
    if (!taSermonPrompt.value.trim()) return;
    navigator.clipboard.writeText(taSermonPrompt.value);
  });

  // ===== 나눔지 생성 =====
  if (btnMakeDiscussion) {
    btnMakeDiscussion.addEventListener("click", async () => {
      const raw = taSermonRaw.value.trim();
      if (!raw) return;
      showLoading();
      const res = await fetch("/api/sermon/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selCategory.value,
          sermon_text: raw,
          user_guide: guideDiscussion.value,
        }),
      });
      const data = await res.json();
      hideLoading();
      taDiscussionOut.value = data.discussion || "";
      discussionBox.classList.remove("hidden");
      autoResize(taDiscussionOut);
    });
  }

  if (btnCopyDiscussion) {
    btnCopyDiscussion.addEventListener("click", () => {
      if (!taDiscussionOut.value.trim()) return;
      navigator.clipboard.writeText(taDiscussionOut.value);
    });
  }
});
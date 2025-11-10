// static/js/guides.js
document.addEventListener("DOMContentLoaded", async () => {
  const pageSel = document.getElementById("guidePage");
  const cateSel = document.getElementById("guideCategory");
  const guideText = document.getElementById("guideText");
  const status = document.getElementById("guideStatus");
  const btnSave = document.getElementById("btnGuideSave");
  const btnReload = document.getElementById("btnGuideReload");

  if (!pageSel) return;

  let allGuides = {};

  async function loadAllGuides() {
    const res = await fetch("/api/guides");
    allGuides = await res.json();
  }

  function fillCategoryOptions() {
    const page = pageSel.value;
    cateSel.innerHTML = "";

    if (page === "bible") {
      cateSel.innerHTML = `
        <option value="morning">morning</option>
        <option value="evening">evening</option>
      `;
    } else if (page === "sermon") {
      const sermon = allGuides.sermon || {};
      const keys = Object.keys(sermon);
      if (keys.length) {
        cateSel.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join("");
      } else {
        cateSel.innerHTML = `
          <option value="dawn">dawn</option>
          <option value="wednesday">wednesday</option>
          <option value="friday">friday</option>
        `;
      }
    } else if (page === "drama") {
      cateSel.innerHTML = `<option value="main">main</option>`;
    }
  }

  function putGuideText() {
    const page = pageSel.value;
    const cat = cateSel.value;
    let text = "";

    if (page === "bible") {
      text = (allGuides.bible && allGuides.bible[cat]) || "";
    } else if (page === "sermon") {
      text =
        (allGuides.sermon &&
          allGuides.sermon[cat] &&
          allGuides.sermon[cat].main) ||
        "";
    } else if (page === "drama") {
      text = (allGuides.drama && allGuides.drama.main) || "";
    }

    guideText.value = text;
    guideText.style.height = "auto";
    guideText.style.height = guideText.scrollHeight + "px";
  }

  await loadAllGuides();
  fillCategoryOptions();
  putGuideText();

  pageSel.addEventListener("change", () => {
    fillCategoryOptions();
    putGuideText();
  });
  cateSel.addEventListener("change", putGuideText);

  btnReload.addEventListener("click", async () => {
    await loadAllGuides();
    fillCategoryOptions();
    putGuideText();
    status.textContent = "🔄 서버에서 다시 가져왔습니다.";
  });

  btnSave.addEventListener("click", async () => {
    const page = pageSel.value;
    const cat = cateSel.value;
    const text = guideText.value;

    let payload = {};
    if (page === "bible") {
      payload = { bible: { [cat]: text } };
    } else if (page === "sermon") {
      payload = { sermon: { [cat]: { main: text } } };
    } else if (page === "drama") {
      payload = { drama: { main: text } };
    }

    await fetch("/api/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    status.textContent = "✅ 저장되었습니다.";
  });
});
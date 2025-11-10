// static/js/drama.js
document.addEventListener("DOMContentLoaded", () => {
  const verse = document.getElementById("dramaVerse");
  const verseText = document.getElementById("dramaText");
  const result = document.getElementById("dramaResult");
  const status = document.getElementById("statusDrama");

  document.getElementById("btnMakeDrama").addEventListener("click", async () => {
    status.textContent = "드라마 대본 생성 중...";

    const prompt = [
      `성경 본문: ${verse.value}`,
      `본문 내용: ${verseText.value}`,
      "",
      "이 본문으로 성경 드라마를 6단계로 작성해줘.",
      "1) 본문 시대/지리/문화 간단 정리",
      "2) 드라마로 뽑을 핵심 포인트 3개",
      "3) 썸네일/제목 5~7개",
      "4) 장면(Scene)별 드라마 초안",
      "5) 자연스러운 말투로 다듬은 완성본",
      "6) 다른 AI에게 넘길 수 있는 프롬프트 형태로 정리",
      "모두 한국어로."
    ].join("\n");

    try {
      const res = await fetch("/api/drama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      result.textContent = data.reply || "응답이 없습니다.";
      status.textContent = "✅ 드라마 생성 완료";
    } catch (err) {
      console.error(err);
      status.textContent = "❌ 드라마 생성 실패";
    }
  });
});
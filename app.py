# app.py
import os
import json
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# -----------------------------
# 0. 환경변수(.env) 정확히 읽기
# -----------------------------
# 이 파일(app.py)이 있는 폴더에서 .env를 찾도록 고정
BASE_DIR = Path(__file__).resolve().parent
dotenv_path = BASE_DIR / ".env"
load_dotenv(dotenv_path)

# .env 안에 이렇게 들어있어야 함:
# OPENAI_API_KEY=sk-xxxx...
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

# -----------------------------
# 1. Flask 기본 설정
# -----------------------------
app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

# -----------------------------
# 2. 지침 저장 위치(iCloud 우선)
# -----------------------------
ICLOUD_ROOT = Path(
    "~/Library/Mobile Documents/com~apple~CloudDocs"
).expanduser()
ICLOUD_APP_DIR = ICLOUD_ROOT / "my_page_data"
ICLOUD_GUIDE_PATH = ICLOUD_APP_DIR / "guidelines.json"
LOCAL_GUIDE_PATH = BASE_DIR / "guidelines.json"


def ensure_icloud_dir() -> bool:
    try:
        ICLOUD_APP_DIR.mkdir(parents=True, exist_ok=True)
        return True
    except Exception:
        return False


def get_guide_path() -> Path:
    if ensure_icloud_dir():
        return ICLOUD_GUIDE_PATH
    return LOCAL_GUIDE_PATH


def load_guides() -> dict:
    path = get_guide_path()
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_guides(data: dict):
    path = get_guide_path()

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    backup_path = path.with_name(f"guidelines_{ts}.json")
    try:
        with open(backup_path, "w", encoding="utf-8") as bf:
            json.dump(data, bf, ensure_ascii=False, indent=2)
    except Exception:
        pass


def deep_update(original: dict, updates: dict) -> dict:
    for k, v in updates.items():
        if k in original and isinstance(original[k], dict) and isinstance(v, dict):
            original[k] = deep_update(original[k], v)
        else:
            original[k] = v
    return original


# -----------------------------
# 3. 기본 페이지
# -----------------------------
@app.route("/")
def index():
    return render_template("index.html")


# -----------------------------
# 4. 지침 API
# -----------------------------
@app.route("/api/guides", methods=["GET", "POST"])
def api_guides():
    if request.method == "GET":
        return jsonify(load_guides())

    data = request.get_json() or {}
    current = load_guides()
    updated = deep_update(current, data)
    save_guides(updated)
    return jsonify({"ok": True})


# -----------------------------
# 5. 설교 페이지
# -----------------------------
@app.route("/sermon")
def sermon_page():
    return render_template("sermon.html")


# -----------------------------
# 6. 설교 본문 분석
# -----------------------------
@app.route("/api/sermon/analyze", methods=["POST"])
def api_sermon_analyze():
    data = request.get_json() or {}
    category = data.get("category", "기본")
    verse = data.get("verse", "")
    passage = data.get("passage", "")
    user_analysis_guide = (data.get("analysis_guide") or "").strip()

    all_guides = load_guides()
    analysis_guides = all_guides.get("sermon_analysis", {})
    saved_analysis = (
        analysis_guides.get("default")
        or analysis_guides.get("passage")
        or ""
    )
    final_analysis_guide = user_analysis_guide or saved_analysis

    prompt = f"""
너는 목회자를 위한 '본문 연구 보조 도구'이다.
아래 형식을 정확히 지켜서 한국어로만 작성하라.

[카테고리] {category}
[본문] {verse}
[본문 내용]
{passage}

[추가 지침]
{final_analysis_guide}

반드시 아래 형식으로만 적어라.

1) 배경 요소 (객관)
- 인물:
- 장소/지리:
- 시간/상황:
- 역사/문화적 사실:

2) 본문 비교/원어/표현 정리
- 한국어 표현에서 주목할 점:
- 원어(히브리어/헬라어)에서 드러나는 의미:
- 구조/반복/대조:

3) 추천 설교 제목
- 제목:
""".strip()

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "너는 해석을 추가하지 않고 본문을 구조화해서 정리해 주는 도우미이다.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    text = completion.choices[0].message.content

    background = ""
    textual = ""
    title = ""
    section = None

    for line in text.splitlines():
        l = line.strip()
        if l.startswith("1)"):
            section = "bg"
            continue
        elif l.startswith("2)"):
            section = "txt"
            continue
        elif l.startswith("3)") or "제목" in l:
            section = "title"
            if ":" in l:
                title = l.split(":", 1)[1].strip()
            continue

        if section == "bg":
            background += line + "\n"
        elif section == "txt":
            textual += line + "\n"
        elif section == "title":
            if not title and l:
                title = l

    return jsonify({
        "background": background.strip(),
        "textual": textual.strip(),
        "title": title.strip(),
    })


# -----------------------------
# 7. 설교 프롬프트 만들기
# -----------------------------
@app.route("/api/sermon", methods=["POST"])
def api_sermon():
    data = request.get_json() or {}
    category = data.get("category", "기본")
    verse = data.get("verse", "")
    passage = data.get("passage", "")

    user_title = (data.get("title") or "").strip()
    background = data.get("background", "")
    textual = data.get("textual", "")
    user_guide = (data.get("guide") or "").strip()

    all_guides = load_guides()
    sermon_guides = all_guides.get("sermon", {})
    saved_sermon_guide = sermon_guides.get(category, "")
    final_sermon_guide = user_guide or saved_sermon_guide

    title_clause = (
        "설교문 프롬프트 맨 위에 한국어 설교 제목 1줄만 넣어라. 제목에 대한 설명 문장은 쓰지 마라."
        if not user_title
        else f"설교 제목은 반드시 '{user_title}'로 쓰게 하라."
    )

    meta_prompt = f"""
너는 설교자가 사용할 '설교문 작성용 프롬프트'를 만들어 주는 도우미이다.
아래에 주어진 분석 결과와 지침을 잘 섞어서,
다른 GPT에게 그대로 붙여넣으면 설교문이 나오도록 아주 구체하게 작성하라.

[설교 카테고리]
{category}

[본문]
{verse}

[본문 내용 요약]
{passage}

[객관적 배경 분석]
{background}

[본문 비교/원어/표현 정리]
{textual}

[설교문 작성 지침]
{final_sermon_guide}

작성 규칙:
- 서론 → 본론(2~3개 포인트) → 적용 → 결론 구조로 설교를 쓰라고 지시하라.
- 회중 대상이 '{category}'임을 분명히 하라.
- 본문에 없는 상상, 과도한 영해는 하지 말라고 지시하라.
- 적용은 실제 생활에 맞게 예시를 넣으라고 지시하라.
- {title_clause}
- 지침 원문을 그대로 나열하지 말고, '해야 할 일'로 재진술해서 써라.
""".strip()

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "너는 한국어 목회 설교를 위한 프롬프트 설계자다.",
            },
            {"role": "user", "content": meta_prompt},
        ],
    )

    gpt_prompt = completion.choices[0].message.content

    return jsonify(
        {
            "title": user_title,
            "prompt": gpt_prompt,
        }
    )


# -----------------------------
# 8. 매일성경 메시지
# -----------------------------
@app.route("/api/bible", methods=["POST"])
def api_bible():
    data = request.get_json() or {}
    prompt = data.get("prompt", "")
    msg_type = data.get("msg_type", "morning")

    guides = load_guides()
    bible_guides = guides.get("bible", {})

    extra = ""
    if msg_type == "morning":
        extra = bible_guides.get("morning", "")
    elif msg_type == "evening":
        extra = bible_guides.get("evening", "")

    user_prompt = f"""
아래는 사용자가 보낸 원본 정보입니다.

[원본 정보]
{prompt}

위 정보로 한국어 묵상 메시지를 써 주세요.

반드시 지켜야 할 규칙:
1. "날짜:" 줄에 적힌 날짜와 요일을 그대로 사용하세요.
2. 본문 내용을 다시 큰따옴표로 감싸지 마세요.
3. 전체 톤은 {"아침에 보내는 밝은 묵상" if msg_type=="morning" else "하루를 마무리하는 따뜻한 저녁 묵상"} 으로 해주세요.
4. 아래 추가 지침이 있으면 그 내용도 반영하세요.

[추가 지침]
{extra}
""".strip()

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "당신은 한국어로 따뜻하고 목회적인 톤의 묵상 메시지를 작성하는 어시스턴트입니다.",
            },
            {"role": "user", "content": user_prompt},
        ],
    )
    reply = completion.choices[0].message.content
    return jsonify({"reply": reply})


# -----------------------------
# 9. 묵상 번역 (영어/일본어)
# -----------------------------
@app.route("/api/translate", methods=["POST"])
def api_translate():
    data = request.get_json() or {}
    text = data.get("text", "")
    target = data.get("target", "en")  # en | ja

    if not text:
        return jsonify({"ok": False, "error": "no text"}), 400

    if target == "ja":
        lang_name = "일본어"
    else:
        lang_name = "영어"

    prompt = f"""
다음 한국어 묵상 메시지를 {lang_name}로 자연스럽게 번역해 주세요.
- 그 나라 기독교인들이 실제로 쓰는 어투를 사용하세요.
- 설명 문장, 사족은 넣지 말고 번역문만 주세요.

원문:
{text}
""".strip()

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "당신은 한국어-외국어 목회 번역 어시스턴트입니다."},
            {"role": "user", "content": prompt},
        ],
    )
    translated = completion.choices[0].message.content.strip()

    return jsonify({"ok": True, "result": translated, "target": target})


# -----------------------------
# 10. visit 페이지
# -----------------------------
VISIT_FILE = BASE_DIR / "visit_records.json"


def load_visit_records():
    if not VISIT_FILE.exists():
        return []
    try:
        with open(VISIT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_visit_records(records):
    with open(VISIT_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


@app.route("/api/visit/suggest", methods=["POST"])
def api_visit_suggest():
    data = request.get_json(force=True)
    name = data.get("name", "").strip()
    visit_type = data.get("visit_type", "").strip()
    reason = data.get("reason", "").strip()
    user_guide = (data.get("guide") or "").strip()

    all_guides = load_guides()
    visit_guides = all_guides.get("visit", {})
    saved_guide = (
        visit_guides.get("default")
        or visit_guides.get("general")
        or ""
    )
    final_guide = user_guide or saved_guide

    prompt = f"""
너는 목회자를 돕는 '심방/장례' 본문 추천 도우미다.

[일반 지침]
{final_guide}

추천 규칙:
1. 지금 들어온 심방 종류와 상황/사유에 꼭 맞는 본문만 고른다.
2. 아래 JSON 배열 형식으로만 출력한다.

현재 정보:
- 대상자: {name or "이름 없음"}
- 심방 종류: {visit_type or "미기입"}
- 상황/사유: {reason or "미기입"}
""".strip()

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "너는 반드시 JSON 배열만 출력하는 도우미다."},
                {"role": "user", "content": prompt},
            ],
        )
        text = completion.choices[0].message.content
        suggestions = json.loads(text)
    except Exception:
        suggestions = [
            {
                "reference": "시편 121편",
                "summary": "하나님이 출입을 지키신다는 약속으로 이사·새 출발 심방에 적합합니다.",
            }
        ]

    return jsonify({"suggestions": suggestions})


@app.route("/api/visit/make-sermon", methods=["POST"])
def api_visit_make_sermon():
    data = request.get_json(force=True)
    name = data.get("name", "")
    visit_type = data.get("visit_type", "")
    reason = data.get("reason", "")
    reference = data.get("reference", "")
    summary = data.get("summary", "")
    user_guide = (data.get("guide") or "").strip()

    all_guides = load_guides()
    visit_guides = all_guides.get("visit", {})
    saved_guide = (
        visit_guides.get("default")
        or visit_guides.get("general")
        or ""
    )
    final_guide = user_guide or saved_guide

    prompt = f"""
너는 한국어 목회자를 돕는 '심방/장례 설교문' 작성 도우미다.

[지켜야 할 지침 - 1순위]
{final_guide}

[상황 정보]
- 대상자: {name}
- 심방 종류: {visit_type}
- 상황/사유: {reason}
- 선택된 본문: {reference}
- 본문 설명: {summary}
""".strip()

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "너는 한국 교회 심방용 짧은 설교문을 써 주는 어시스턴트다."},
                {"role": "user", "content": prompt},
            ],
        )
        sermon_text = completion.choices[0].message.content
    except Exception:
        sermon_text = f"{reference} 말씀을 붙들고 위로를 전합니다..."

    return jsonify({"sermon": sermon_text})


@app.route("/api/visit/save", methods=["POST"])
def api_visit_save():
    data = request.get_json(force=True)
    name = data.get("name", "")
    visit_type = data.get("visit_type", "")
    reason = data.get("reason", "")
    sermon = data.get("sermon", "")
    reference = data.get("reference", "")

    records = load_visit_records()
    records.insert(0, {
        "date": datetime.now().strftime("%Y.%m.%d(%a)"),
        "name": name,
        "visit_type": visit_type,
        "reason": reason,
        "reference": reference,
        "sermon": sermon,
    })
    save_visit_records(records)
    return jsonify({"ok": True})


@app.route("/api/visit/records", methods=["GET"])
def api_visit_records():
    records = load_visit_records()
    return jsonify({"records": records})


@app.route("/visit")
def visit_page():
    return render_template("visit.html")


# -----------------------------
# 서버 실행
# -----------------------------
if __name__ == "__main__":
    print("🟢 Flask 서버를 3001 포트로 시작합니다...")
    app.run(host="127.0.0.1", port=3001, debug=True)
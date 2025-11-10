import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

# 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

load_dotenv()

app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static"
)
CORS(app)

# OpenAI 클라이언트
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --------------------------------------------------
# 1) 메인 페이지 (항상 이거 한 장)
# --------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# --------------------------------------------------
# 2) 매일성경 API
# --------------------------------------------------
@app.route("/api/bible", methods=["POST"])
def api_bible():
    data = request.get_json()
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    system_prompt = (
        "너는 한국 교회 목회자가 성도들에게 보내는 짧은 말씀 메시지를 쓸 때 돕는 조수다. "
        "본문에서 벗어나지 않고, 말투는 따뜻하고, 한국어로, 오전과 저녁 지침을 확인해서 작업한다."
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        print("BIBLE API ERROR:", e)
        return jsonify({"error": "bible api failed"}), 500


# --------------------------------------------------
# 3) 드라마 API
# --------------------------------------------------
@app.route("/api/drama", methods=["POST"])
def api_drama():
    data = request.get_json()
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    system_prompt = (
        "너는 성경 본문을 영상으로 만들 수 있는 드라마 대본으로 풀어주는 작가다. "
        "장면(Scene)별로 나누고, 등장인물, 대사, 동작을 한국어로 자연스럽게 작성해라."
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        print("DRAMA API ERROR:", e)
        return jsonify({"error": "drama api failed"}), 500


# --------------------------------------------------
# 4) ImageFX / 이미지 생성 (선택)
# --------------------------------------------------
@app.route("/api/imagefx", methods=["POST"])
def api_imagefx():
    data = request.get_json()
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400
    try:
        image = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024"
        )
        url = image.data[0].url
        return jsonify({"image_url": url})
    except Exception as e:
        print("IMAGE API ERROR:", e)
        return jsonify({"error": "image api failed"}), 500


if __name__ == "__main__":
    print("🟢 Flask 서버를 3001 포트로 시작합니다...")
    app.run(host="127.0.0.1", port=3001, debug=True)
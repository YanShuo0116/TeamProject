import os
import subprocess
import shutil
import zipfile
import urllib.request
import time
from flask import Flask, request, render_template, jsonify, send_from_directory
import whisper
from werkzeug.utils import secure_filename

app = Flask(__name__)
model = whisper.load_model("base")

UPLOAD_FOLDER = "uploads"
FFMPEG_FOLDER = "ffmpeg"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(FFMPEG_FOLDER, exist_ok=True)

def is_ffmpeg_available():
    if shutil.which("ffmpeg"):
        return True
    ffmpeg_path = os.path.join(FFMPEG_FOLDER, "ffmpeg.exe")
    return os.path.isfile(ffmpeg_path)

def download_and_extract_ffmpeg():
    print("ffmpeg 不存在，開始下載並安裝...")
    url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    zip_path = "ffmpeg.zip"
    urllib.request.urlretrieve(url, zip_path)
    print("下載完成，開始解壓...")

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(FFMPEG_FOLDER)

    os.remove(zip_path)
    print("解壓完成")

    # 把 bin 目錄下的 ffmpeg.exe 移到 FFMPEG_FOLDER 根目錄
    for root, dirs, files in os.walk(FFMPEG_FOLDER):
        if "ffmpeg.exe" in files:
            src = os.path.join(root, "ffmpeg.exe")
            dst = os.path.join(FFMPEG_FOLDER, "ffmpeg.exe")
            if src != dst:
                shutil.move(src, dst)
            break

    # 清理多餘資料夾（可選）
    for f in os.listdir(FFMPEG_FOLDER):
        path = os.path.join(FFMPEG_FOLDER, f)
        if os.path.isdir(path) and "ffmpeg.exe" not in os.listdir(path):
            shutil.rmtree(path)

    print("ffmpeg 安裝完成")

def ensure_ffmpeg():
    if not is_ffmpeg_available():
        download_and_extract_ffmpeg()
    else:
        print("系統已有 ffmpeg")

def get_ffmpeg_cmd():
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    return os.path.join(FFMPEG_FOLDER, "ffmpeg.exe")

ensure_ffmpeg()

@app.route("/")
def index():
    return render_template("voice.html")

@app.route("/upload", methods=["POST"])
def upload():
    audio = request.files.get("audio")
    reference = request.form.get("reference", "").strip().lower()

    if not audio:
        return jsonify({"error": "未收到音訊檔"}), 400

    filename = secure_filename(audio.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio.save(filepath)

    converted_path = os.path.splitext(filepath)[0] + ".wav"
    ffmpeg_cmd = get_ffmpeg_cmd()
    subprocess.run([
        ffmpeg_cmd, "-y", "-i", filepath, converted_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    result = model.transcribe(converted_path)
    predicted_text = result["text"].strip().lower()

    try:
        import Levenshtein
        similarity = Levenshtein.ratio(reference, predicted_text)
    except ImportError:
        similarity = 1.0 if reference == predicted_text else 0.0

    return jsonify({
        "reference": reference,
        "transcribed": predicted_text,
        "similarity": round(similarity, 2),
        "match": similarity >= 0.3,
        "audio_url": f"/uploads/{os.path.basename(converted_path)}?t={int(time.time())}"
    })

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True) 
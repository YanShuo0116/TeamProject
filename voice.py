"""
voice.py

輕量語音處理工具：預留給語音相關的功能，例如：
- 文字轉語音 (TTS)
- 基本的語音檔案處理 / 路徑管理
- 簡單的評分介面（如需）

說明：目前專案的評分 API 已在 app.py 內實作（/api/voice/evaluate）。
這個模組提供可重用的工具方法，未直接綁定到 Flask 路由，
方便未來需要時從其他模組匯入使用。
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import subprocess
import sys

try:
    from faster_whisper import WhisperModel  # 高效 Whisper 實作
    _HAS_FASTER_WHISPER = True
except Exception:  # noqa: BLE001
    _HAS_FASTER_WHISPER = False


DEFAULT_AUDIO_DIR = Path("uploads") / "voice"


def ensure_directory(path: Path) -> None:
    """確保資料夾存在。"""
    path.mkdir(parents=True, exist_ok=True)


@dataclass
class TTSResult:
    success: bool
    file_path: Optional[Path] = None
    error: Optional[str] = None


def save_audio_bytes(audio_bytes: bytes, filename: str, base_dir: Path = DEFAULT_AUDIO_DIR) -> Path:
    """將音訊位元組資料儲存成檔案，回傳實際檔案路徑。"""
    ensure_directory(base_dir)
    file_path = base_dir / filename
    file_path.write_bytes(audio_bytes)
    return file_path


def synthesize_speech_to_file(
    text: str,
    filename: str = "tts_output.wav",
    voice_accent: str = "us",
    base_dir: Path = DEFAULT_AUDIO_DIR,
) -> TTSResult:
    """
    文字轉語音（TTS）占位實作：
    - 目前不依賴外部服務，僅產生空白檔作為預留流程。
    - 之後可在此接上雲端 TTS 或本地 TTS 引擎。
    """
    try:
        ensure_directory(base_dir)
        file_path = base_dir / filename
        # 產生一個合法的空 wav 檔頭或直接建立空檔以保留流程
        file_path.write_bytes(b"")
        return TTSResult(success=True, file_path=file_path)
    except Exception as exc:  # noqa: BLE001 - 保持簡潔
        return TTSResult(success=False, error=str(exc))


def simple_pronunciation_score(reference_text: str, recognized_text: str) -> float:
    """
    超輕量評分：以字串相似度粗略回傳 0~100 分。
    僅作為暫時占位，實務上請替換為真正的 ASR/評測服務。
    """
    if not reference_text and not recognized_text:
        return 100.0
    if not reference_text or not recognized_text:
        return 0.0
    ref = reference_text.strip().lower()
    rec = recognized_text.strip().lower()
    same = sum(1 for a, b in zip(ref, rec) if a == b)
    denom = max(len(ref), 1)
    return round((same / denom) * 100.0, 1)


def transcode_to_wav(input_path: Path, output_path: Path, sample_rate: int = 16000) -> Path:
    """使用 ffmpeg 將音訊轉為 16kHz 單聲道 wav。需要系統已安裝 ffmpeg。"""
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        str(output_path),
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return output_path
    except subprocess.CalledProcessError as exc:  # noqa: TRY003
        raise RuntimeError(f"ffmpeg 轉檔失敗: {exc}") from exc


def whisper_transcribe(audio_path: Path, model_size: str = "base") -> str:
    """使用 faster-whisper 將音檔轉文字。若未安裝，拋錯提示。"""
    if not _HAS_FASTER_WHISPER:
        raise RuntimeError("未安裝 faster-whisper，請先 pip install faster-whisper")

    model = WhisperModel(model_size)
    segments, _ = model.transcribe(str(audio_path), beam_size=1)
    text_parts = [seg.text.strip() for seg in segments]
    return " ".join(p for p in text_parts if p)


def asr_with_ffmpeg_and_whisper(raw_bytes: bytes, temp_name: str = "recording.webm", model_size: str = "base") -> str:
    """原始音訊位元組 -> 存檔 -> ffmpeg 轉 wav -> Whisper 轉文字，回傳辨識結果。"""
    ensure_directory(DEFAULT_AUDIO_DIR)
    raw_path = DEFAULT_AUDIO_DIR / temp_name
    raw_path.write_bytes(raw_bytes)

    wav_path = DEFAULT_AUDIO_DIR / (raw_path.stem + ".wav")
    transcode_to_wav(raw_path, wav_path, sample_rate=16000)
    transcript = whisper_transcribe(wav_path, model_size=model_size)
    return transcript


__all__ = [
    "TTSResult",
    "ensure_directory",
    "save_audio_bytes",
    "synthesize_speech_to_file",
    "simple_pronunciation_score",
]



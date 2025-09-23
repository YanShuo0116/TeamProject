// voice.js - 語音評測專用腳本

// 自動填入單字
(function() {
  const params = new URLSearchParams(window.location.search);
  const word = params.get('word');
  if (word) {
    document.getElementById('reference').value = word;
  }
})();

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const audioPlayer = document.getElementById("audioPlayer");

window.startRecording = function() {
  if (isRecording) return;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    statusEl.textContent = "🎙️ 錄音中...";

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.start();
  }).catch(err => {
    statusEl.textContent = "❌ 無法存取麥克風：" + err.message;
  });
}

window.stopRecording = function() {
  if (!isRecording || !mediaRecorder) return;

  mediaRecorder.onstop = async () => {
    statusEl.textContent = "⏳ 辨識中...";

    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    formData.append("reference", document.getElementById("reference").value);

    try {
      const response = await fetch("/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("伺服器錯誤：" + errorText);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      resultEl.textContent =
        `你說的是：${result.transcribed}\n應該是：${result.reference}\n相似度：${(result.similarity * 100).toFixed(1)}%\n結果：${result.match ? "✅ 正確" : "❌ 有誤"}`;

      // 播放音檔（防止快取）
      if (result.audio_url) {
        audioPlayer.src = result.audio_url;
        audioPlayer.style.display = "block";
        audioPlayer.load();
        audioPlayer.play().catch(e => {
          console.log("自動播放失敗:", e);
        });
      }

      statusEl.textContent = "✅ 分析完成";
    } catch (error) {
      statusEl.textContent = "❌ 發生錯誤：" + error.message;
    }

    isRecording = false;
  };

  mediaRecorder.stop();
  statusEl.textContent = "⏹️ 錄音結束，處理中...";
} 
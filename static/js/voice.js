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
      // 步驟 1: 上傳音檔並取得語音辨識文字
      const uploadResponse = await fetch("/voice/upload", { // 修正路由
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`伺服器錯誤: ${uploadResponse.statusText}`);
      }

      const transcriptionResult = await uploadResponse.json();

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error);
      }

      statusEl.textContent = "🤖 AI 評估中...";

      // 步驟 2: 將辨識結果送去 AI 評估
      const evaluateResponse = await fetch("/api/voice/evaluate", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: transcriptionResult.reference,
          transcribed: transcriptionResult.transcribed
        })
      });

      if (!evaluateResponse.ok) {
        throw new Error(`AI 評估伺服器錯誤: ${evaluateResponse.statusText}`);
      }

      const evaluationResult = await evaluateResponse.json();

      if (!evaluationResult.success) {
        throw new Error(evaluationResult.error);
      }

      // 步驟 3: 顯示豐富的評估結果
      const evaluation = evaluationResult.evaluation;
      resultEl.innerHTML = `
        <p><strong>你說的是：</strong> ${transcriptionResult.transcribed}</p>
        <p><strong>參考答案：</strong> ${transcriptionResult.reference}</p>
        <hr>
        <h4>AI 評估結果</h4>
        <p><strong>分數：</strong> ${evaluation.score} / 100</p>
        <p><strong>總體回饋：</strong> ${evaluation.feedback}</p>
        <p><strong>改進建議：</strong> ${evaluation.suggestion}</p>
        <p><strong>建議說法：</strong> ${evaluation.improved_answer}</p>
      `;

      // 顯示並播放音檔
      if (transcriptionResult.audio_url) {
        audioPlayer.src = transcriptionResult.audio_url;
        audioPlayer.style.display = "block";
        audioPlayer.load();
        audioPlayer.play().catch(e => console.log("自動播放失敗:", e));
      }

      statusEl.textContent = "✅ 分析完成";
    } catch (error) {
      statusEl.textContent = `❌ 發生錯誤：${error.message}`;
      resultEl.textContent = '請重試';
    }

    isRecording = false;
  };

  mediaRecorder.stop();
  statusEl.textContent = "⏹️ 錄音結束，處理中...";
} 
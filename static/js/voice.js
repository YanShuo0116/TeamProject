// voice.js - 語音評測專用腳本
// voice.js - 改良版（容錯 + 顯示後端實際回傳資料）

// 自動填入單字
(function() {
  const params = new URLSearchParams(window.location.search);
  const word = params.get('word');
  if (word) {
    const refEl = document.getElementById('reference');
    if (refEl) refEl.value = word;
  }
})();

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const audioPlayer = document.getElementById("audioPlayer");

// 簡單相似度（字元位置比對的 fallback）
function fallbackSimilarity(a = "", b = "") {
  a = (a || "").trim().toLowerCase();
  b = (b || "").trim().toLowerCase();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const la = a.length, lb = b.length;
  let same = 0;
  const min = Math.min(la, lb);
  for (let i = 0; i < min; i++) if (a[i] === b[i]) same++;
  return same / Math.max(la, lb);
}

// 格式化顯示相似度
function formatSimilarity(sim) {
  if (typeof sim !== 'number' || isNaN(sim)) return '0.0%';
  return (sim * 100).toFixed(1) + '%';
}

window.startRecording = function() {
  if (isRecording) return;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    statusEl.textContent = "🎙️ 錄音中...";

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.start();
  }).catch(err => {
    statusEl.textContent = "❌ 無法存取麥克風：" + err.message;
    console.error("getUserMedia error:", err);
  });
}

window.stopRecording = function() {
  if (!isRecording || !mediaRecorder) return;

  mediaRecorder.onstop = async () => {
    statusEl.textContent = "⏳ 上傳並辨識中...";
    resultEl.textContent = "";

    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    formData.append("reference", document.getElementById("reference").value || "");

    try {
      const uploadResponse = await fetch("/voice/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const txt = await uploadResponse.text();
        throw new Error(`伺服器錯誤: ${uploadResponse.status} ${uploadResponse.statusText} - ${txt}`);
      }

      const transcriptionResult = await uploadResponse.json();
      console.log("transcriptionResult (from /voice/upload):", transcriptionResult);

      if (!transcriptionResult || !transcriptionResult.success) {
        const errMsg = transcriptionResult?.error || '語音辨識失敗（未回傳成功訊息）';
        throw new Error(errMsg);
      }

      const transcribed = (transcriptionResult.transcribed ?? transcriptionResult.text ?? transcriptionResult.recognized ?? transcriptionResult.result ?? "").toString().trim();
      const reference = (transcriptionResult.reference ?? transcriptionResult.expected ?? document.getElementById("reference").value ?? "").toString().trim();

      let similarity = transcriptionResult.similarity;
      if (typeof similarity === 'string') {
        similarity = Number(similarity);
      }
      if (typeof similarity !== 'number' || isNaN(similarity)) {
        if (typeof transcriptionResult.match === 'boolean') {
          similarity = transcriptionResult.match ? 1.0 : 0.0;
        } else {
          similarity = fallbackSimilarity(reference, transcribed);
        }
      }
      similarity = Math.max(0, Math.min(1, similarity));

      let evaluation = null;
      try {
        statusEl.textContent = "🤖 AI 評估中...";
        const evalResp = await fetch("/api/voice/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: reference, transcribed: transcribed })
        });

        if (evalResp.ok) {
          const evalJson = await evalResp.json();
          console.log("/api/voice/evaluate result:", evalJson);
          if (evalJson && evalJson.success && evalJson.evaluation) {
            evaluation = evalJson.evaluation;
          } else {
            console.warn("/api/voice/evaluate 未回傳預期 evaluation，用本地 fallback 評分");
          }
        } else {
          const t = await evalResp.text();
          console.warn("評估 API 回傳非 200:", evalResp.status, t);
        }
      } catch (e) {
        console.warn("呼叫 /api/voice/evaluate 發生錯誤:", e);
      }
      if (!evaluation) {
        const score = Math.round(similarity * 100);
        let feedback, suggestion;
        if (score === 100) { feedback = "完美！發音非常清晰。"; suggestion = "繼續保持 👍"; }
        else if (score >= 80) { feedback = "很好，接近正確。"; suggestion = "再注意細節，例如母音或結尾音。"; }
        else if (score >= 50) { feedback = "有些正確，但需要加強。"; suggestion = "多聽範例發音，練習語調。"; }
        else { feedback = "幾乎不正確，需要多加練習。"; suggestion = "建議分音節慢慢練習，逐步改進。"; }
        evaluation = {
          score: score,
          feedback: feedback,
          suggestion: suggestion,
          improved_answer: reference || transcribed
        };
      }

      const simText = formatSimilarity(similarity);
      resultEl.innerHTML = `
        <div>
          <p><strong>你說的是：</strong> ${transcribed || "<span class='text-muted'>無</span>"}</p>
          <p><strong>參考答案：</strong> ${reference || "<span class='text-muted'>無</span>"}</p>
          <hr>
          <h4>AI 評估結果</h4>
          <p><strong>分數：</strong> ${evaluation.score} / 100</p>
          <p><strong>總體回饋：</strong> ${evaluation.feedback}</p>
          <p><strong>改進建議：</strong> ${evaluation.suggestion}</p>
          <p><strong>建議說法：</strong> ${evaluation.improved_answer}</p>
          <p><strong>相似度（後端/計算）：</strong> ${simText}</p>
          <p><strong>結果：</strong> ${similarity >= 0.3 ? '✅ 正確' : '❌ 有誤'}</p>
        </div>
      `;

      if (transcriptionResult.audio_data) {
        audioPlayer.src = "data:audio/wav;base64," + transcriptionResult.audio_data;
        audioPlayer.style.display = "block";
        audioPlayer.load();
        audioPlayer.play().catch(e => console.log("自動播放被阻擋:", e));
      } else if (transcriptionResult.audio_url) {
        audioPlayer.src = transcriptionResult.audio_url;
        audioPlayer.style.display = "block";
        audioPlayer.load();
      } else {
        const tmpUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = tmpUrl;
        audioPlayer.style.display = "block";
      }

      statusEl.textContent = "✅ 分析完成（可回放下方錄音）";
    } catch (error) {
      console.error("stopRecording error:", error);
      statusEl.textContent = `❌ 發生錯誤：${error.message}`;
      resultEl.textContent = '請重試';
    } finally {
      isRecording = false;
    }
  };

  mediaRecorder.stop();
  statusEl.textContent = "⏹️ 錄音結束，處理中...";
}

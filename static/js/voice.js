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

  // 🔧 iOS 特殊處理：使用語音識別
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && window.iOSSpeechHandler && window.iOSSpeechHandler.isSupported()) {
    return startiOSRecording();
  }

  // 🔧 修復：改進手機版兼容性
  const audioConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100
    }
  };

  navigator.mediaDevices.getUserMedia(audioConstraints).then(stream => {
    statusEl.textContent = "🎙️ 錄音中...";

    // 🔧 修復：檢測支援的音頻格式
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    let mimeType = 'audio/webm';
    if (isIOS || isSafari) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }
    }

    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType });
    } catch (e) {
      // 如果指定格式不支援，使用預設格式
      mediaRecorder = new MediaRecorder(stream);
    }
    
    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.start();
    console.log(`Recording started with MIME type: ${mimeType}`);
  }).catch(err => {
    let errorMessage = "❌ 無法存取麥克風：" + err.message;
    if (err.name === 'NotAllowedError') {
      errorMessage = "❌ 請允許麥克風權限。在手機上，請點擊網址列的麥克風圖示並選擇「允許」。";
    }
    statusEl.textContent = errorMessage;
    console.error("getUserMedia error:", err);
  });
}

// 🔧 新增：iOS 專用錄音函數
function startiOSRecording() {
  // 設定 iOS 語音處理器回調
  window.iOSSpeechHandler.setCallbacks(
    // onResult
    (transcript, confidence) => {
      console.log('🎤 iOS 語音識別結果:', transcript);
      
      // 模擬原有的處理流程
      const reference = document.getElementById("reference").value || "";
      
      // 計算相似度
      let similarity = 0;
      if (reference && transcript) {
        similarity = calculateSimilarity(reference.toLowerCase(), transcript.toLowerCase());
      }
      
      // 顯示結果
      resultEl.innerHTML = `
        <div>
          <p><strong>你說的是：</strong> ${transcript}</p>
          <p><strong>參考答案：</strong> ${reference}</p>
          <p><strong>相似度：</strong> ${(similarity * 100).toFixed(1)}%</p>
          <p><strong>結果：</strong> ${similarity >= 0.3 ? '✅ 正確' : '❌ 有誤'}</p>
        </div>
      `;
      
      statusEl.textContent = "✅ iOS 語音識別完成";
      isRecording = false;
    },
    // onError
    (error) => {
      statusEl.textContent = "❌ iOS 語音識別錯誤：" + error;
      isRecording = false;
    },
    // onStatus
    (status) => {
      statusEl.textContent = status;
    }
  );

  // 啟動語音識別
  window.iOSSpeechHandler.startRecognition().then(success => {
    if (success) {
      isRecording = true;
      statusEl.textContent = "🎤 iOS 語音識別中...";
    } else {
      statusEl.textContent = "❌ iOS 語音識別啟動失敗";
    }
  });
}

// 🔧 新增：簡單相似度計算
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

window.stopRecording = function() {
  // 🔧 iOS 特殊處理
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS && window.iOSSpeechHandler) {
    window.iOSSpeechHandler.stopRecognition();
    isRecording = false;
    statusEl.textContent = "🛑 iOS 語音識別已停止";
    return;
  }

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

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const statusEl = document.createElement("p");
document.body.appendChild(statusEl);

const audioPlayer = document.createElement("audio");
audioPlayer.controls = true;
audioPlayer.style.display = "none";
document.body.appendChild(audioPlayer);

function startRecording() {
  if (isRecording) return;

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    statusEl.textContent = "🎙️ 錄音中...";

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    isRecording = true;

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      statusEl.textContent = "⏳ 上傳中...";
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

        document.getElementById("result").textContent =
          `你說的是：${result.transcribed}
應該是：${result.reference}
相似度：${(result.similarity * 100).toFixed(1)}%
結果：${result.match ? "✅ 正確" : "❌ 有誤"}`;

        // 設定音檔播放
        if (result.audio_url) {
          audioPlayer.src = result.audio_url;
          audioPlayer.style.display = "block";
        }

        statusEl.textContent = "✅ 分析完成";

      } catch (error) {
        statusEl.textContent = "❌ 發生錯誤：" + error.message;
      }

      isRecording = false;
    };

    mediaRecorder.start();
  }).catch(err => {
    statusEl.textContent = "❌ 無法存取麥克風：" + err.message;
  });
}

function stopRecording() {
  if (isRecording && mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    statusEl.textContent = "⏹️ 錄音結束，處理中...";
  }
}


from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage # Updated import
from langchain_community.vectorstores import Chroma # Updated import
import os
import io # Required for gTTS
import base64
import sys
from flask import Flask, render_template_string, request, session, redirect, url_for, jsonify
from chroma import ChromaDBManager, list_pdf_files
from gtts import gTTS # For Text-to-Speech

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-preview-04-17")
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
app = Flask(__name__)
app.secret_key = os.urandom(24)

# HTML 模板
HTML = '''
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <title>PDF 問答系統 專題測試ver 0.3</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 600px; margin: auto; }
        select, input[type=text] { width: 100%; padding: 8px; margin: 8px 0; }
        button { padding: 8px 16px; }
        .answer { background: #f0f0f0; padding: 12px; border-radius: 6px; margin-top: 16px; }
    </style>
</head>
<body>
<div class="container">
    <h2>PDF 問答系統 測試版本</h2>
    <form method="post">
        <label>選擇 PDF：</label>
        <select name="pdf_path">
            {% for pdf in pdf_files %}
            <option value="{{ pdf }}" {% if pdf==selected_pdf %}selected{% endif %}>{{ pdf }}</option>
            {% endfor %}
        </select>
        <label>輸入問題：</label>
        <input type="text" name="question" value="{{ question|default('') }}" required>
        <button type="submit">送出</button>
    </form>
    {% if answer %}
    <div class="answer">
        <b>回答：</b><br>{{ answer }}
    </div>
    {% endif %}
    <p style="text-align: center; margin-top: 20px;"><a href="{{ url_for('english_tutor') }}">前往英文老師對話練習</a></p>
</div>
</body>
</html>
'''

# HTML 模板 - 英文老師對話
TUTOR_HTML = '''
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <title>英文老師對話練習</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f9; display: flex; justify-content: center; align-items: center; min-height: 90vh;}
        .container { width: 100%; max-width: 700px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #333; }
        .chatbox { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; background: #f9f9f9; border-radius: 4px; }
        .message { margin-bottom: 10px; padding: 8px 12px; border-radius: 15px; max-width: 70%; clear: both; }
        .user_message { background-color: #dcf8c6; float: right; text-align: right; }
        .tutor_message { background-color: #e9e9eb; float: left; text-align: left; }
        .message p { margin: 0; padding: 5px; word-wrap: break-word; }
        .message .sender { font-weight: bold; font-size: 0.9em; margin-bottom: 3px; }
        input[type=text] { width: calc(100% - 90px); padding: 10px; margin-right: 5px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;}
        button[type=submit] { width: 80px; padding: 10px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; box-sizing: border-box;}
        button:hover { background-color: #0056b3; }
        #recordButton:hover { background-color: #1e7e34; } /* Darker green for record button hover */
        .controls { display: flex; margin-top: 10px; }
        .voice-controls { text-align: center; margin-top: 15px; color: #777;}
        .nav-link { text-align: center; margin-top:20px; }
    </style>
</head>
<body>
<div class="container">
    <h2>與 Gemini 英文老師練習對話</h2>
    <div class="chatbox" id="chatbox">
        {% for msg_data in conversation_history %}
            {% if msg_data.role == 'user' %}
            <div class="message user_message">
                <p class="sender">You</p>
                <p style="white-space: pre-wrap;">{{ msg_data.content }}</p>
            </div>
            {% elif msg_data.role == 'tutor' %}
            <div class="message tutor_message">
                <p class="sender">Gemini Tutor</p>
                <p style="white-space: pre-wrap;">{{ msg_data.content }}</p>
            </div>
            {% endif %}
        {% endfor %}
    </div>
    <form id="tutorForm" class="controls" enctype="multipart/form-data">
        <input type="text" id="userInputText" name="user_input" placeholder="輸入訊息..." value="{{ current_input|default('') }}" autocomplete="off">
        <input type="file" id="audioFileInput" name="audio_file" accept="audio/*" style="margin-left: 5px;">
        <button type="submit">送出</button>
    </form>
    <div class="voice-controls" style="margin-top: 20px; display: flex; align-items: center; justify-content: center;">
        <button type="button" id="recordButton" style="padding: 10px 15px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right:10px;">開始錄音</button>
        <span style="font-size: 0.9em;">（提示：或使用上方欄位上傳音訊檔案）</span>
    </div>
    <audio id="tutorAudioPlayer" style="display:none;"></audio> <!-- Hidden audio player -->
    <p class="nav-link"><a href="{{ url_for('index') }}">回到 PDF 問答系統</a> | <a href="{{ url_for('clear_tutor_session') }}">清除對話紀錄</a></p>
</div>
<script>
    const chatbox = document.getElementById('chatbox');
    const tutorForm = document.getElementById('tutorForm');
    const userInputText = document.getElementById('userInputText');
    const audioFileInput = document.getElementById('audioFileInput');
    const recordButton = document.getElementById('recordButton');
    const tutorAudioPlayer = document.getElementById('tutorAudioPlayer');
    let mediaRecorder;
    let audioChunks = [];

    function updateChatUI(conversationHistory) {
        chatbox.innerHTML = ''; // Clear existing messages
        conversationHistory.forEach(msgData => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            if (msgData.role === 'user') {
                messageDiv.classList.add('user_message');
                messageDiv.innerHTML = `<p class="sender">You</p><p style="white-space: pre-wrap;">${msgData.content}</p>`;
            } else if (msgData.role === 'tutor') {
                messageDiv.classList.add('tutor_message');
                messageDiv.innerHTML = `<p class="sender">Gemini Tutor</p><p style="white-space: pre-wrap;">${msgData.content}</p>`;
            }
            chatbox.appendChild(messageDiv);
        });
        chatbox.scrollTop = chatbox.scrollHeight;
        userInputText.focus();
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        recordButton.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                mediaRecorder.stop();
                recordButton.textContent = '開始錄音';
                recordButton.style.backgroundColor = '#28a745';
            } else {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        mediaRecorder = new MediaRecorder(stream);
                        mediaRecorder.start();
                        audioChunks = [];
                        recordButton.textContent = '停止錄音';
                        recordButton.style.backgroundColor = '#dc3545';

                        mediaRecorder.addEventListener("dataavailable", event => {
                            audioChunks.push(event.data);
                        });

                        mediaRecorder.addEventListener("stop", () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                            const formData = new FormData(tutorForm); // Get existing form data (text, file)
                            formData.append('live_audio', audioBlob, 'live_recording.webm');
                            
                            // If live audio is provided, we might want to clear the file input
                            // or decide on a priority. For now, both can be sent if populated.
                            // audioFileInput.value = ''; // Optional: clear file input if live recording is used

                            submitFormData(formData);
                            stream.getTracks().forEach(track => track.stop()); // Stop microphone access
                        });
                    })
                    .catch(error => {
                        console.error("Error accessing microphone:", error);
                        alert("無法獲取麥克風權限: " + error.message);
                        recordButton.textContent = '開始錄音';
                        recordButton.style.backgroundColor = '#28a745';
                    });
            }
        });
    } else {
        recordButton.disabled = true;
        recordButton.textContent = '不支援錄音';
    }

    tutorForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission
        const formData = new FormData(tutorForm);
        submitFormData(formData);
    });

    function submitFormData(formData) {
        fetch("{{ url_for('english_tutor') }}", {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            updateChatUI(data.conversation_history);
            userInputText.value = ''; // Clear text input
            audioFileInput.value = ''; // Clear file input
            if (data.tutor_audio_b64) {
                tutorAudioPlayer.src = "data:audio/mpeg;base64," + data.tutor_audio_b64;
                tutorAudioPlayer.play();
            }
        })
        .catch(error => console.error('Error submitting form:', error));
    }

    // Initial scroll and focus
    chatbox.scrollTop = chatbox.scrollHeight;
    document.querySelector('input[name="user_input"]').focus();
</script>
</body>
</html>
'''

@app.route('/', methods=['GET', 'POST'])
def index():
    pdf_files = list_pdf_files()
    answer = None
    question = None
    selected_pdf = pdf_files[0] if pdf_files else None
    if request.method == 'POST':
        selected_pdf = request.form['pdf_path']
        question = request.form['question']
        # 每個 PDF 對應一個子資料庫目錄
        db_dir = f"./chroma_db/{os.path.splitext(os.path.basename(selected_pdf))[0]}"
        # 若該子資料庫不存在，提示請先由 chroma.py 建立
        if not os.path.exists(db_dir):
            answer = f"找不到對應的向量資料庫，請先用 chroma.py 建立 {selected_pdf} 的資料庫。"
        else:
            # 使用既有子資料庫
            vectordb = Chroma(persist_directory=db_dir, embedding_function=embeddings)
            retriever = vectordb.as_retriever(search_kwargs={"k": 5})
            template = """
            你是個有幫助的AI助手。
            請根據提供的上下文來回答問題。
            context: {context}
            input: {input}
            answer:
            """
            prompt = PromptTemplate.from_template(template)
            combine_docs_chain = create_stuff_documents_chain(llm, prompt)
            retrieval_chain = create_retrieval_chain(retriever, combine_docs_chain)
            response = retrieval_chain.invoke({"input": question})
            answer = response["answer"]
    return render_template_string(HTML, pdf_files=pdf_files, answer=answer, question=question, selected_pdf=selected_pdf)

# System prompt for the English tutor
TUTOR_SYSTEM_PROMPT = """你是一位來自台灣的英文老師，名叫 'Gemini Tutor'。你非常有耐心、友善且風趣。
你的目標是幫助學生練習英語口說和日常對話。
請用自然、親切的語氣和學生對話，多給予鼓勵。你的回覆中可以適度使用表情符號 (emoji) 來增加親切感。
當學生犯錯時，請溫和地指正，並提供正確的說法或建議。
盡量使用英文回答，但如果學生用中文提問或表達困難，你可以用中文輔助解釋，然後鼓勵他們用英文嘗試。
對話時，請保持簡潔，一次回答不要太長（例如，1-3句話），以利於對話的流暢性。
如果學生不知道要聊什麼，你可以主動開啟一些日常話題，例如興趣、天氣、學習、食物等。
讓我們開始一場輕鬆的對話練習吧！"""

@app.route('/english_tutor', methods=['GET', 'POST'])
def english_tutor():
    if 'tutor_conversation' not in session:
        session['tutor_conversation'] = []
        # 可選擇在這裡讓老師先說一句開場白，或等使用者先發言
        # 例如: session['tutor_conversation'].append({'role': 'tutor', 'content': "Hi there! I'm Gemini, your English tutor. Ready to chat?"})

    current_input = ""
    if request.method == 'POST':
        user_input = request.form.get('user_input', '').strip()
        uploaded_audio_file = request.files.get('audio_file') # From file input
        live_audio_file = request.files.get('live_audio') # From live recording

        # Prioritize live audio if both are somehow sent, or handle as needed
        # For this example, let's say live_audio takes precedence if it exists
        audio_file_to_process = live_audio_file if live_audio_file and live_audio_file.filename != '' else uploaded_audio_file

        llm_message_parts = []
        user_display_content = user_input

        if user_input:
            llm_message_parts.append({"type": "text", "text": user_input})

        if audio_file_to_process and audio_file_to_process.filename != '':
            try:
                # Ensure the file pointer is at the beginning if it's a SpooledTemporaryFile
                audio_file_to_process.seek(0)
                audio_data = audio_file_to_process.read()
                encoded_audio = base64.b64encode(audio_data).decode("utf-8")
                audio_mime_type = audio_file_to_process.mimetype or "audio/webm" # Default for live recording often webm or ogg
                llm_message_parts.append({
                    "type": "media",
                    "data": encoded_audio,
                    "mime_type": audio_mime_type,
                })
                if not user_display_content:
                    user_display_content = "[Audio message sent]"
                elif user_input: # Append only if there was also text
                    user_display_content += " [Audio also sent]"
            except Exception as e:
                # Handle audio processing error, maybe log it or inform user
                print(f"Error processing audio file: {e}")
                user_display_content += " [Error processing audio]"

        if llm_message_parts: # If there's anything to send (text or audio)
            session['tutor_conversation'].append({'role': 'user', 'content': user_display_content})

            messages_for_llm = [SystemMessage(content=TUTOR_SYSTEM_PROMPT)]
            for msg_data in session['tutor_conversation']:
                if msg_data['role'] == 'user':
                    # For history, assume text content. Actual multimodal handled for current input.
                    messages_for_llm.append(HumanMessage(content=msg_data['content']))
                elif msg_data['role'] == 'tutor':
                    messages_for_llm.append(AIMessage(content=msg_data['content']))
            # Remove the last appended user message from history as it will be replaced by the structured one
            messages_for_llm.pop() 
            messages_for_llm.append(HumanMessage(content=llm_message_parts))

            try:
                ai_response = llm.invoke(messages_for_llm)
                tutor_reply = ai_response.content
                session['tutor_conversation'].append({'role': 'tutor', 'content': tutor_reply})
            except Exception as e:
                tutor_reply = f"抱歉，我遇到了一個錯誤，暫時無法回覆：{str(e)}"
                session['tutor_conversation'].append({'role': 'tutor', 'content': tutor_reply})

            session.modified = True
            current_input = "" # Clear text input after successful submission

    return render_template_string(TUTOR_HTML, 
                                  conversation_history=session.get('tutor_conversation', []), 
                                  current_input=current_input)

@app.route('/clear_tutor_session')
def clear_tutor_session():
    session.pop('tutor_conversation', None)
    return redirect(url_for('english_tutor'))

if __name__ == "__main__":
    app.run(debug=True)

import gradio as gr
import json
import os
import shutil
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.database_manager import DatabaseManager
from src.qa_system import QASystem
from src.safe_gemini_llm import GeminiLLM
from src.utils import get_loader
from src.api_key_manager import get_key, set_key, delete_key, list_keys
from config import settings

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "database_config.json")
DATA_FOLDER = "data"

manager = DatabaseManager(CONFIG_PATH)
qa_system_cache = {}

def refresh_db_list():
    return manager.list_databases()

def ask_question(query, selected_dbs):
    if not query.strip():
        return "請輸入問題。"
    if not selected_dbs:
        return "請至少選擇一個資料庫。"
    db_key = tuple(sorted(selected_dbs))
    if db_key not in qa_system_cache:
        qa_system_cache[db_key] = QASystem(list(selected_dbs))
    qa = qa_system_cache[db_key]

    try:
        answer = qa.ask(query)
        return answer
    except Exception as e:
        return f"查詢錯誤：{str(e)}"

def upload_and_build(file_obj, dataset_name):
    if not file_obj or not dataset_name.strip():
        return "❌ 請上傳檔案並輸入資料庫名稱。"
    os.makedirs(DATA_FOLDER, exist_ok=True)
    ext = os.path.splitext(file_obj.name)[1]
    save_path = os.path.join(DATA_FOLDER, f"{dataset_name}{ext}")
    shutil.copy(file_obj.name, save_path)

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    if dataset_name in config:
        return "❗ 此資料庫名稱已存在，請換一個名稱。"

    config[dataset_name] = {
        "path": save_path,
        "vector_path": f"vector_db/{dataset_name}"
    }
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    try:
        manager.build_vector_db(dataset_name)
        qa_system_cache.clear()
        return f"✅ 成功建立資料庫：{dataset_name}"
    except Exception as e:
        return f"❌ 建立失敗：{e}"

def delete_database(dataset_name):
    if not dataset_name:
        return "❌ 請選擇要刪除的資料庫名稱。"

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    if dataset_name not in config:
        return "❗ 找不到此資料庫。"

    try:
        file_path = config[dataset_name]["path"]
        vector_path = config[dataset_name]["vector_path"]

        keys_to_delete = [k for k in qa_system_cache if dataset_name in k]
        for key in keys_to_delete:
            qa = qa_system_cache.pop(key)
            if hasattr(qa, "retriever") and hasattr(qa.retriever, "vectorstore"):
                chroma = qa.retriever.vectorstore
                if hasattr(chroma, "persist"):
                    chroma._collection = None
                    del chroma

        import gc
        gc.collect()
        import time
        time.sleep(0.5)

        if os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(vector_path):
            shutil.rmtree(vector_path)

    except Exception as e:
        return f"❌ 刪除檔案時出錯：{e}"

    config.pop(dataset_name)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    return f"🗑️ 資料庫 {dataset_name} 已刪除。"

def preview_database(dataset_name):
    if not dataset_name:
        return "❌ 請選擇要預覽的資料庫。"
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    if dataset_name not in config:
        return "❗ 找不到此資料庫。"

    file_path = config[dataset_name]["path"]
    try:
        loader = get_loader(file_path)
        documents = loader.load()
        preview_texts = []
        for i, doc in enumerate(documents[:5]):
            preview_texts.append(f"（段落{i+1}）\n{doc.page_content[:500]}...\n")
        return "\n".join(preview_texts)
    except Exception as e:
        return f"❌ 預覽時出錯：{e}"

def save_api_key_ui(name, key):
    set_key(name, key)
    return f"✅ 成功儲存 API 金鑰：{name}"

def delete_api_key_ui(name):
    delete_key(name)
    return f"🗑️ 已刪除 API 金鑰：{name}"

def show_api_keys_ui():
    return "\n".join(list_keys())

# Gradio UI
with gr.Blocks() as demo:
    gr.Markdown("# 🧠 博凱 LangChain 問答系統")

    with gr.Row():
        query_input = gr.Textbox(label="輸入問題", placeholder="例如：What is the English word for 貪心?")
    with gr.Row():
        db_select = gr.CheckboxGroup(label="選擇查詢資料庫")
    with gr.Row():
        ask_btn = gr.Button("查詢")
        output = gr.Textbox(label="回答", lines=8)
    ask_btn.click(fn=ask_question, inputs=[query_input, db_select], outputs=output)

    gr.Markdown("---\n\n## 📂 上傳新教材並建立資料庫")
    with gr.Row():
        file_input = gr.File(label="上傳教材檔案（.txt, .csv, .pdf）")
        dataset_name_input = gr.Textbox(label="資料庫名稱（例如：animal_words）")
    with gr.Row():
        upload_btn = gr.Button("上傳並建立資料庫")
        upload_msg = gr.Textbox(label="系統訊息", lines=3)
    upload_btn.click(fn=upload_and_build, inputs=[file_input, dataset_name_input], outputs=upload_msg)

    gr.Markdown("---\n\n## 🗑️ 刪除資料庫")
    with gr.Row():
        delete_select = gr.Dropdown(label="選擇要刪除的資料庫")
    with gr.Row():
        delete_btn = gr.Button("刪除資料庫")
        delete_msg = gr.Textbox(label="系統訊息", lines=2)
    delete_btn.click(fn=delete_database, inputs=delete_select, outputs=delete_msg)

    gr.Markdown("---\n\n## 🔍 預覽教材內容")
    with gr.Row():
        preview_select = gr.Dropdown(label="選擇要預覽的資料庫")
    with gr.Row():
        preview_btn = gr.Button("預覽教材")
        preview_output = gr.Textbox(label="教材預覽", lines=15)
    preview_btn.click(fn=preview_database, inputs=preview_select, outputs=preview_output)

    gr.Markdown("---\n\n## 🔄 更新資料庫清單")
    with gr.Row():
        refresh_btn = gr.Button("更新介面中所有資料庫選項")
    refresh_btn.click(
        fn=lambda: tuple(gr.update(choices=refresh_db_list()) for _ in range(3)),
        inputs=[],
        outputs=[db_select, delete_select, preview_select]
    )

    gr.Markdown("---\n\n## 🔑 API 金鑰管理")
    with gr.Row():
        api_name = gr.Textbox(label="API 名稱（例如：openai, gemini）")
        api_key = gr.Textbox(label="API 金鑰")
    with gr.Row():
        save_key_btn = gr.Button("儲存 API 金鑰")
        delete_key_btn = gr.Button("刪除 API 金鑰")
    with gr.Row():
        key_msg = gr.Textbox(label="系統訊息", lines=2)
    with gr.Row():
        key_list_btn = gr.Button("顯示目前所有金鑰")
        key_list_output = gr.Textbox(label="目前金鑰列表", lines=4)

    save_key_btn.click(fn=save_api_key_ui, inputs=[api_name, api_key], outputs=key_msg)
    delete_key_btn.click(fn=delete_api_key_ui, inputs=api_name, outputs=key_msg)
    key_list_btn.click(fn=show_api_keys_ui, inputs=[], outputs=key_list_output)

if __name__ == "__main__":
    demo.launch()
# speaking_practice.py - 口說練習功能管理器

import os
import json
try:
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain.prompts import PromptTemplate
    from langchain.chains import create_retrieval_chain
    from langchain.chains.combine_documents import create_stuff_documents_chain
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("LangChain 模組未安裝，使用基本功能")

try:
    from api_manager import SafeGenerativeModel
    API_MANAGER_AVAILABLE = True
except ImportError:
    API_MANAGER_AVAILABLE = False
    print("API Manager 未可用")

class SpeakingPracticeManager:
    def __init__(self):
        """初始化口說練習管理器"""
        if LANGCHAIN_AVAILABLE:
            try:
                self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
            except Exception as e:
                print(f"LangChain embeddings 初始化失敗: {e}")
                self.embeddings = None
        else:
            self.embeddings = None
            
        if API_MANAGER_AVAILABLE:
            try:
                self.safe_model = SafeGenerativeModel()
            except Exception as e:
                print(f"API Manager 初始化失敗: {e}")
                self.safe_model = None
        else:
            self.safe_model = None
        
        # 口說練習主題配置
        self.topics = {
            1: {
                "title": "Introducing Yourself",
                "description": "學生彼此初次見面，自我介紹名字、年級、興趣",
                "scenarios": [
                    "在新學校第一天自我介紹",
                    "參加英語夏令營認識新朋友", 
                    "在國際交流活動中介紹自己",
                    "加入新的社團時自我介紹",
                    "遇到外國遊客時介紹自己"
                ]
            },
            2: {
                "title": "Ordering Food",
                "description": "在速食店或餐廳點餐，含點餐、加點、結帳",
                "scenarios": [
                    "在麥當勞點餐",
                    "在學校餐廳選擇午餐",
                    "在咖啡店點飲料和點心",
                    "在披薩店訂餐",
                    "在冰淇淋店選擇口味"
                ]
            },
            3: {
                "title": "Asking for Directions",
                "description": "在街上問路，如問怎麼走到圖書館或捷運站",
                "scenarios": [
                    "問去圖書館的路",
                    "尋找最近的捷運站",
                    "問去學校的方向",
                    "找尋附近的便利商店",
                    "詢問公車站的位置"
                ]
            },
            4: {
                "title": "At the Supermarket",
                "description": "問價錢、詢問商品在哪裡、結帳互動",
                "scenarios": [
                    "詢問水果的價格",
                    "找尋特定商品的位置",
                    "在收銀台結帳",
                    "詢問是否有折扣",
                    "問營業時間"
                ]
            },
            5: {
                "title": "Making an Appointment",
                "description": "跟醫院、牙醫、理髮店預約時間",
                "scenarios": [
                    "預約看醫生",
                    "預約牙醫檢查",
                    "預約理髮",
                    "預約補習班試聽",
                    "預約圖書館討論室"
                ]
            },
            6: {
                "title": "Shopping for Clothes",
                "description": "在服飾店選衣服、詢問尺寸、試穿與付款",
                "scenarios": [
                    "詢問衣服尺寸",
                    "要求試穿衣服",
                    "詢問是否有其他顏色",
                    "比較不同款式",
                    "詢問價格和付款方式"
                ]
            },
            7: {
                "title": "At the Doctor's Office",
                "description": "說明身體不適的症狀，醫師給建議",
                "scenarios": [
                    "描述感冒症狀",
                    "說明肚子痛的情況",
                    "詢問藥物使用方法",
                    "預約下次回診",
                    "詢問注意事項"
                ]
            },
            8: {
                "title": "Talking about Daily Routines",
                "description": "描述平日作息，例如幾點起床、上學、做功課等",
                "scenarios": [
                    "描述平日的作息時間",
                    "分享週末的活動",
                    "談論放學後的安排",
                    "討論睡前的習慣",
                    "分享假期的計畫"
                ]
            },
            9: {
                "title": "Asking for Help",
                "description": "在校園裡請老師/同學幫忙找東西、搬東西、解釋問題",
                "scenarios": [
                    "請同學幫忙找遺失的物品",
                    "請老師解釋不懂的問題",
                    "請朋友幫忙搬重物",
                    "請求協助完成作業",
                    "尋求技術支援"
                ]
            },
            10: {
                "title": "Making Invitations",
                "description": "邀請朋友參加生日派對、看電影、去公園等",
                "scenarios": [
                    "邀請朋友參加生日派對",
                    "約朋友一起看電影",
                    "邀請同學去公園玩",
                    "約朋友一起做功課",
                    "邀請參加學校活動"
                ]
            },
            11: {
                "title": "Talking about Hobbies",
                "description": "描述自己的興趣，例如打球、畫畫、聽音樂等",
                "scenarios": [
                    "分享運動愛好",
                    "討論音樂喜好",
                    "談論藝術興趣",
                    "分享閱讀習慣",
                    "討論收集嗜好"
                ]
            },
            12: {
                "title": "Talking about the Weather",
                "description": "今天的天氣如何、適合做什麼活動（可延伸到旅遊）",
                "scenarios": [
                    "討論今天的天氣",
                    "計畫適合天氣的活動",
                    "談論季節變化",
                    "分享天氣對心情的影響",
                    "討論旅遊天氣"
                ]
            }
        }
        
        # CEFR難度等級
        self.cefr_levels = {
            "A1": {
                "name": "初級入門",
                "description": "基礎詞彙，簡單句型",
                "vocabulary_range": "基礎300-500詞",
                "sentence_complexity": "簡單現在式，基本問答"
            },
            "A2": {
                "name": "初級進階", 
                "description": "日常對話，基本時態",
                "vocabulary_range": "常用600-1000詞",
                "sentence_complexity": "過去式、未來式，簡單複合句"
            },
            "B1": {
                "name": "中級入門",
                "description": "流暢對話，複雜表達",
                "vocabulary_range": "進階1000-1500詞",
                "sentence_complexity": "完成式、條件句，複雜句型"
            }
        }

    def load_speaking_standards(self):
        """載入口說標準PDF的向量資料庫"""
        try:
            persist_directory = "./chroma_db/口說標準"
            if os.path.exists(persist_directory):
                vectordb = Chroma(persist_directory=persist_directory, embedding_function=self.embeddings)
                return vectordb
            else:
                print("口說標準資料庫不存在，需要先建立")
                return None
        except Exception as e:
            print(f"載入口說標準資料庫時發生錯誤: {e}")
            return None

    def generate_question(self, topic_id, cefr_level, scenario_index=0):
        """根據主題和難度生成問題"""
        if topic_id not in self.topics:
            return {"error": "無效的主題ID"}
        
        topic = self.topics[topic_id]
        level_info = self.cefr_levels.get(cefr_level, self.cefr_levels["A1"])
        scenario = topic["scenarios"][scenario_index % len(topic["scenarios"])]
        
        # 使用RAG從口說標準PDF獲取相關內容（如果可用）
        context = ""
        if self.embeddings:
            try:
                vectordb = self.load_speaking_standards()
                if vectordb:
                    query = f"{topic['title']} {cefr_level} speaking practice"
                    docs = vectordb.similarity_search(query, k=3)
                    context = "\n".join([doc.page_content for doc in docs])
            except Exception as e:
                print(f"RAG搜尋錯誤: {e}")
        
        # 如果有API Manager，使用AI生成；否則使用預設模板
        if self.safe_model:
            return self._generate_ai_question(topic, level_info, scenario, context, topic_id, cefr_level, scenario_index)
        else:
            return self._generate_template_question(topic, level_info, scenario, topic_id, cefr_level, scenario_index)
    
    def _generate_ai_question(self, topic, level_info, scenario, context, topic_id, cefr_level, scenario_index):
        """使用AI生成問題"""
        prompt = f"""
        你是一位專業的英語口說練習老師。請根據以下資訊生成一個適合的口說練習問題：

        主題: {topic['title']} - {topic['description']}
        情境: {scenario}
        CEFR等級: {cefr_level} ({level_info['name']})
        詞彙範圍: {level_info['vocabulary_range']}
        句型複雜度: {level_info['sentence_complexity']}
        
        參考標準: {context}
        
        請生成：
        1. 一個具體的情境描述（中文）
        2. 一個引導性問題（英文）
        3. 期望的回答長度和複雜度說明
        4. 3個關鍵詞彙提示（英文）
        
        回答格式請使用JSON：
        {{
            "situation": "情境描述",
            "question": "英文問題",
            "guidance": "回答指導",
            "keywords": ["詞彙1", "詞彙2", "詞彙3"],
            "expected_length": "期望回答長度"
        }}
        """
        
        try:
            response = self.safe_model.generate_content(prompt)
            # 修復：確保 response 是字符串
            response_text = response.text if hasattr(response, 'text') else str(response)
            
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                result["topic_id"] = topic_id
                result["cefr_level"] = cefr_level
                result["scenario_index"] = scenario_index
                return result
            else:
                return self._generate_template_question(topic, level_info, scenario, topic_id, cefr_level, scenario_index)
        except Exception as e:
            print(f"AI生成問題失敗: {e}")
            return self._generate_template_question(topic, level_info, scenario, topic_id, cefr_level, scenario_index)
    
    def _generate_template_question(self, topic, level_info, scenario, topic_id, cefr_level, scenario_index):
        """使用預設模板生成問題"""
        # 預設問題模板
        question_templates = {
            1: {  # Introducing Yourself
                "A1": {
                    "question": "Please tell me your name and what grade you are in.",
                    "keywords": ["name", "grade", "student"]
                },
                "A2": {
                    "question": "Please introduce yourself and tell me about your hobbies.",
                    "keywords": ["introduce", "hobby", "like"]
                },
                "B1": {
                    "question": "Please introduce yourself and describe your future goals.",
                    "keywords": ["introduce", "future", "goal"]
                }
            },
            2: {  # Ordering Food
                "A1": {
                    "question": "You are at McDonald's. What would you like to order?",
                    "keywords": ["order", "food", "please"]
                },
                "A2": {
                    "question": "You are at a restaurant. Order your meal and ask about the price.",
                    "keywords": ["order", "meal", "price"]
                },
                "B1": {
                    "question": "You are at a restaurant with friends. Order food and discuss your preferences.",
                    "keywords": ["order", "prefer", "recommend"]
                }
            }
            # 可以為其他主題添加更多模板
        }
        
        # 獲取對應的問題模板
        topic_templates = question_templates.get(topic_id, question_templates[1])
        template = topic_templates.get(cefr_level, topic_templates["A1"])
        
        return {
            "situation": f"情境：{scenario}",
            "question": template["question"],
            "guidance": f"請用{level_info['name']}程度回答，{level_info['sentence_complexity']}",
            "keywords": template["keywords"],
            "expected_length": "2-4句話" if cefr_level == "A1" else "3-5句話" if cefr_level == "A2" else "4-6句話",
            "topic_id": topic_id,
            "cefr_level": cefr_level,
            "scenario_index": scenario_index
        }

    def evaluate_response(self, user_response, original_question, cefr_level):
        """評估用戶的回答"""
        level_info = self.cefr_levels.get(cefr_level, self.cefr_levels["A1"])
        
        # 如果有AI模型，使用AI評估；否則使用模板評估
        if self.safe_model:
            return self._ai_evaluate_response(user_response, original_question, cefr_level, level_info)
        else:
            return self._template_evaluate_response(user_response, original_question, cefr_level, level_info)
    
    def _ai_evaluate_response(self, user_response, original_question, cefr_level, level_info):
        """使用AI進行回答評估"""
        prompt = f"""
        你是一位專業的英語口說評估老師。請評估學生的英語回答：

        原始問題: {original_question.get('question', '')}
        情境: {original_question.get('situation', '')}
        學生回答: {user_response}
        目標等級: {cefr_level} ({level_info['name']})
        期望詞彙: {level_info['vocabulary_range']}
        期望句型: {level_info['sentence_complexity']}
        
        請提供詳細評估：
        1. 語法正確性評分 (1-10) - 檢查時態、語序、語法結構
        2. 詞彙使用評分 (1-10) - 評估詞彙豐富度和準確性
        3. 流暢度評分 (1-10) - 評估表達的自然度和連貫性
        4. 內容相關性評分 (1-10) - 評估回答是否切題和完整
        5. 具體的改進建議（中英文）
        6. 優化後的回答範例（英文）
        7. 發音和語調建議
        
        回答格式請使用JSON：
        {{
            "grammar_score": 分數,
            "vocabulary_score": 分數,
            "fluency_score": 分數,
            "relevance_score": 分數,
            "overall_score": 總分,
            "feedback_chinese": "詳細的中文回饋和建議",
            "feedback_english": "Detailed English feedback and suggestions",
            "improved_answer": "優化後的英文回答範例",
            "pronunciation_tips": "發音和語調的具體建議",
            "strengths": "學生的優點",
            "areas_for_improvement": "需要改進的地方"
        }}
        """
        
        try:
            response = self.safe_model.generate_content(prompt)
            # 修復：確保 response 是字符串
            response_text = response.text if hasattr(response, 'text') else str(response)
            
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                # 確保總分是其他分數的平均值
                scores = [
                    result.get('grammar_score', 0),
                    result.get('vocabulary_score', 0),
                    result.get('fluency_score', 0),
                    result.get('relevance_score', 0)
                ]
                result['overall_score'] = round(sum(scores) / len(scores), 1)
                return result
            else:
                return self._template_evaluate_response(user_response, original_question, cefr_level, level_info)
        except Exception as e:
            print(f"AI評估失敗: {e}")
            return self._template_evaluate_response(user_response, original_question, cefr_level, level_info)
    
    def _template_evaluate_response(self, user_response, original_question, cefr_level, level_info):
        """使用模板進行回答評估"""
        # 基本分析
        response_length = len(user_response.split())
        has_keywords = any(keyword.lower() in user_response.lower() 
                          for keyword in original_question.get('keywords', []))
        
        # 根據CEFR等級調整評分標準
        if cefr_level == "A1":
            expected_length = (3, 8)
            base_score = 6
        elif cefr_level == "A2":
            expected_length = (5, 12)
            base_score = 7
        else:  # B1
            expected_length = (8, 15)
            base_score = 8
        
        # 長度評分
        length_score = base_score
        if response_length < expected_length[0]:
            length_score -= 2
        elif response_length > expected_length[1]:
            length_score -= 1
        
        # 關鍵詞使用評分
        keyword_score = base_score + (2 if has_keywords else -1)
        
        # 基本語法檢查（簡單規則）
        grammar_score = base_score
        if user_response.count('.') == 0 and response_length > 5:
            grammar_score -= 1  # 缺少句號
        if not user_response[0].isupper():
            grammar_score -= 1  # 首字母未大寫
        
        # 計算各項分數
        scores = {
            'grammar_score': max(1, min(10, grammar_score)),
            'vocabulary_score': max(1, min(10, keyword_score)),
            'fluency_score': max(1, min(10, length_score)),
            'relevance_score': max(1, min(10, base_score + (1 if has_keywords else -1)))
        }
        
        overall_score = round(sum(scores.values()) / len(scores), 1)
        
        # 生成回饋
        feedback_templates = {
            "A1": {
                "good": "很好！你能用簡單的英文表達想法。繼續練習基本句型。",
                "improve": "試著使用更多基本詞彙，注意句子的完整性。"
            },
            "A2": {
                "good": "不錯！你的表達比較清楚。可以嘗試使用更多時態。",
                "improve": "建議多練習過去式和未來式，讓表達更豐富。"
            },
            "B1": {
                "good": "很棒！你能流暢地表達複雜想法。",
                "improve": "可以嘗試使用更高級的詞彙和句型結構。"
            }
        }
        
        level_feedback = feedback_templates.get(cefr_level, feedback_templates["A1"])
        feedback_chinese = level_feedback["good"] if overall_score >= 7 else level_feedback["improve"]
        
        return {
            **scores,
            'overall_score': overall_score,
            'feedback_chinese': feedback_chinese,
            'feedback_english': f"Good effort! Your response shows {cefr_level} level understanding. Keep practicing!",
            'improved_answer': user_response,  # 在模板模式下不修改原回答
            'pronunciation_tips': "Focus on clear pronunciation and natural rhythm.",
            'strengths': "You attempted to answer the question",
            'areas_for_improvement': "Continue practicing vocabulary and grammar"
        }

    def get_topics_list(self):
        """獲取所有主題列表"""
        return self.topics
    
    def get_cefr_levels(self):
        """獲取CEFR等級列表"""
        return self.cefr_levels
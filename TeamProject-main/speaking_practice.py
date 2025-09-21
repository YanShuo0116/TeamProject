# speaking_practice_test.py - 測試版口說練習功能管理器

import os
import json

class SpeakingPracticeManager:
    def __init__(self):
        """測試版初始化 - 避免所有外部依賴"""
        print("🔧 初始化 SpeakingPracticeManager...")
        
        # 不使用任何外部 API，避免初始化失敗
        self.embeddings = None
        self.safe_model = None
        
        # 嘗試載入 API Manager（如果可用）
        try:
            from api_manager import SafeGenerativeModel
            self.safe_model = SafeGenerativeModel()
            print("✅ API Manager 載入成功")
        except Exception as e:
            print(f"⚠️ API Manager 載入失敗: {e}")
            print("將使用模板模式")
        
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
        
        print("✅ 初始化完成")

    def generate_question(self, topic_id, cefr_level, scenario_index=0):
        """生成問題 - 測試版"""
        print(f"🎯 生成問題: 主題{topic_id}, 難度{cefr_level}, 情境{scenario_index}")
        
        if topic_id not in self.topics:
            return {"error": "無效的主題ID"}
        
        topic = self.topics[topic_id]
        level_info = self.cefr_levels.get(cefr_level, self.cefr_levels["A1"])
        scenario = topic["scenarios"][scenario_index % len(topic["scenarios"])]
        
        # 如果有 API Manager，嘗試使用 AI 生成
        if self.safe_model:
            try:
                return self._ai_generate_question(topic, level_info, scenario, topic_id, cefr_level, scenario_index)
            except Exception as e:
                print(f"⚠️ AI 生成失敗，使用模板: {e}")
        
        # 使用模板生成
        return self._template_generate_question(topic, level_info, scenario, topic_id, cefr_level, scenario_index)

    def _ai_generate_question(self, topic, level_info, scenario, topic_id, cefr_level, scenario_index):
        """AI 生成問題"""
        
        # 針對服飾店購物的特殊處理
        if topic_id == 6:  # Shopping for Clothes
            prompt = f"""
            你是專業的英語口說練習老師。請為國小學生生成一個服飾店購物的對話練習：

            情境: {scenario}
            CEFR等級: {cefr_level} ({level_info['name']})
            
            請按照以下要求生成：
            1. 情境描述：學生和媽媽在服飾店，學生看到喜歡的T-shirt但不知道尺寸
            2. 店員的問候語作為英文問題（例如：Can I help you? 或 Do you need any help?）
            3. 學生應該回答詢問T-shirt尺寸（例如：Do you have this t-shirt in size medium?）
            4. 提供回答指導和關鍵詞
            
            回答格式：
            {{
                "situation": "你和媽媽一起到服飾店買衣服，你看到一件你很喜歡的T-shirt，但是不知道有沒有適合你的尺寸。你想問店員是否有你需要的尺寸。",
                "question": "店員的問候語（英文）",
                "guidance": "你應該詢問T-shirt的尺寸，可以說 'Do you have this t-shirt in size...' 或 'Excuse me, do you have this in...'",
                "keywords": ["t-shirt", "size", "medium", "large", "small"],
                "expected_length": "1-2句話"
            }}
            """
        else:
            prompt = f"""
            你是專業的英語口說練習老師。請為國小學生生成一個口說練習問題：

            主題: {topic['title']} - {topic['description']}
            情境: {scenario}
            CEFR等級: {cefr_level} ({level_info['name']})
            詞彙範圍: {level_info['vocabulary_range']}
            句型複雜度: {level_info['sentence_complexity']}
            
            請生成：
            1. 具體情境描述（中文）
            2. 對方的問話作為英文問題（讓學生回應）
            3. 回答指導（中文）
            4. 3-5個關鍵詞彙提示（英文）
            
            回答格式：
            {{
                "situation": "情境描述",
                "question": "對方的問話（英文）",
                "guidance": "回答指導",
                "keywords": ["詞彙1", "詞彙2", "詞彙3"],
                "expected_length": "期望回答長度"
            }}
            """
        
        response = self.safe_model.generate_content(prompt)
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # 嘗試解析 JSON
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                result.update({
                    "topic_id": topic_id,
                    "cefr_level": cefr_level,
                    "scenario_index": scenario_index
                })
                print("✅ AI 問題生成成功")
                return result
            except json.JSONDecodeError:
                print("⚠️ JSON 解析失敗，使用模板")
        
        return self._template_generate_question(topic, level_info, scenario, topic_id, cefr_level, scenario_index)

    def _template_generate_question(self, topic, level_info, scenario, topic_id, cefr_level, scenario_index):
        """模板生成問題"""
        print("🔧 使用模板生成問題")
        
        # 預設問題模板庫 - 改為對話形式
        question_templates = {
            1: {  # Introducing Yourself
                "A1": {
                    "question": "Hi! What's your name?",
                    "keywords": ["name", "grade", "student"],
                    "situation": "你在學校遇到新同學，他想認識你。"
                },
                "A2": {
                    "question": "Hello! Can you tell me about yourself and your hobbies?",
                    "keywords": ["introduce", "hobby", "like"],
                    "situation": "你參加英語夏令營，輔導員想了解你。"
                },
                "B1": {
                    "question": "Nice to meet you! Could you introduce yourself and share your future plans?",
                    "keywords": ["introduce", "future", "goal"],
                    "situation": "你在國際交流活動中，外國學生想認識你。"
                }
            },
            2: {  # Ordering Food
                "A1": {
                    "question": "Hello! What would you like to order today?",
                    "keywords": ["hamburger", "fries", "drink"],
                    "situation": "你在麥當勞，服務員問你要點什麼。"
                },
                "A2": {
                    "question": "Good afternoon! Are you ready to order?",
                    "keywords": ["order", "meal", "price"],
                    "situation": "你在餐廳，服務員來為你點餐。"
                },
                "B1": {
                    "question": "Welcome! What can I recommend for you today?",
                    "keywords": ["recommend", "prefer", "special"],
                    "situation": "你和朋友在新餐廳，服務員推薦菜色。"
                }
            },
            6: {  # Shopping for Clothes
                "A1": {
                    "question": "Can I help you?",
                    "keywords": ["t-shirt", "size", "medium"],
                    "situation": "你和媽媽一起到服飾店買衣服，你看到一件你很喜歡的T-shirt，但是不知道有沒有適合你的尺寸。你想問店員是否有你需要的尺寸。"
                },
                "A2": {
                    "question": "Do you need any help finding something?",
                    "keywords": ["size", "color", "try on"],
                    "situation": "你在服飾店找衣服，店員主動來幫忙。"
                },
                "B1": {
                    "question": "Are you looking for anything specific today?",
                    "keywords": ["specific", "style", "occasion"],
                    "situation": "你在服飾店為特殊場合挑選衣服，店員詢問你的需求。"
                }
            }
            # 可以繼續添加其他主題...
        }
        
        # 獲取對應模板
        topic_templates = question_templates.get(topic_id, question_templates[1])
        template = topic_templates.get(cefr_level, topic_templates["A1"])
        
        # 使用模板中的情境或預設情境
        situation = template.get("situation", scenario)
        
        # 根據主題生成適當的回答指導
        guidance_templates = {
            6: "你應該詢問T-shirt的尺寸，可以說 'Do you have this t-shirt in size medium?' 或 'Excuse me, do you have this in large?'",
            2: "你可以說 'I would like...' 或 'Can I have...' 來點餐",
            1: "記得說出你的名字、年級和興趣愛好"
        }
        
        guidance = guidance_templates.get(topic_id, f"請用{level_info['name']}程度回答，{level_info['sentence_complexity']}")
        
        return {
            "situation": situation,
            "question": template["question"],
            "guidance": guidance,
            "keywords": template["keywords"],
            "expected_length": "1-2句話" if cefr_level == "A1" else "2-3句話" if cefr_level == "A2" else "3-4句話",
            "topic_id": topic_id,
            "cefr_level": cefr_level,
            "scenario_index": scenario_index
        }

    def evaluate_response(self, user_response, original_question, cefr_level):
        """評估用戶回答 - 測試版"""
        print(f"📊 評估回答: {user_response[:50]}...")
        
        level_info = self.cefr_levels.get(cefr_level, self.cefr_levels["A1"])
        
        # 如果有 API Manager，嘗試使用 AI 評估
        if self.safe_model:
            try:
                return self._ai_evaluate_response(user_response, original_question, cefr_level, level_info)
            except Exception as e:
                print(f"⚠️ AI 評估失敗，使用模板: {e}")
        
        # 使用模板評估
        return self._template_evaluate_response(user_response, original_question, cefr_level, level_info)

    def _ai_evaluate_response(self, user_response, original_question, cefr_level, level_info):
        """AI 評估回答"""
        prompt = f"""
        你是專業的英語口說評估老師。請評估國小學生的英語回答：

        原始問題: {original_question.get('question', '')}
        學生回答: {user_response}
        目標等級: {cefr_level} ({level_info['name']})
        
        請提供評估（1-10分）：
        1. 語法正確性
        2. 詞彙使用
        3. 流暢度
        4. 內容相關性
        5. 中文回饋
        6. 英文回饋
        7. 改進建議
        
        回答格式：
        {{
            "grammar_score": 分數,
            "vocabulary_score": 分數,
            "fluency_score": 分數,
            "relevance_score": 分數,
            "overall_score": 總分,
            "feedback_chinese": "中文回饋",
            "feedback_english": "English feedback",
            "improved_answer": "改進後的回答",
            "strengths": "優點",
            "areas_for_improvement": "改進建議"
        }}
        """
        
        response = self.safe_model.generate_content(prompt)
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # 嘗試解析 JSON
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
                # 計算總分
                scores = [
                    result.get('grammar_score', 0),
                    result.get('vocabulary_score', 0),
                    result.get('fluency_score', 0),
                    result.get('relevance_score', 0)
                ]
                result['overall_score'] = round(sum(scores) / len(scores), 1)
                print("✅ AI 評估成功")
                return result
            except json.JSONDecodeError:
                print("⚠️ JSON 解析失敗，使用模板")
        
        return self._template_evaluate_response(user_response, original_question, cefr_level, level_info)

    def _template_evaluate_response(self, user_response, original_question, cefr_level, level_info):
        """模板評估回答"""
        print("🔧 使用模板評估")
        
        # 基本分析
        response_length = len(user_response.split())
        has_keywords = any(keyword.lower() in user_response.lower() 
                          for keyword in original_question.get('keywords', []))
        
        # 根據 CEFR 等級調整評分
        base_scores = {"A1": 6, "A2": 7, "B1": 8}
        base_score = base_scores.get(cefr_level, 6)
        
        # 長度評分
        expected_lengths = {"A1": (3, 8), "A2": (5, 12), "B1": (8, 15)}
        expected_length = expected_lengths.get(cefr_level, (3, 8))
        
        length_score = base_score
        if response_length < expected_length[0]:
            length_score -= 2
        elif response_length > expected_length[1]:
            length_score -= 1
        
        # 關鍵詞評分
        keyword_score = base_score + (2 if has_keywords else -1)
        
        # 基本語法檢查
        grammar_score = base_score
        if user_response.count('.') == 0 and response_length > 5:
            grammar_score -= 1
        if not user_response[0].isupper():
            grammar_score -= 1
        
        # 計算分數
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
            'improved_answer': user_response,
            'strengths': "You attempted to answer the question appropriately",
            'areas_for_improvement': "Continue practicing vocabulary and sentence structure"
        }

    def get_topics_list(self):
        """獲取主題列表"""
        return self.topics
    
    def get_cefr_levels(self):
        """獲取CEFR等級列表"""
        return self.cefr_levels

# 測試函數
def test_speaking_practice():
    print("🧪 開始測試口說練習功能...")
    
    try:
        # 初始化管理器
        manager = SpeakingPracticeManager()
        
        # 測試主題載入
        topics = manager.get_topics_list()
        print(f"✅ 載入 {len(topics)} 個主題")
        
        # 測試問題生成
        question = manager.generate_question(1, 'A1', 0)
        print(f"✅ 問題生成: {question.get('question', 'N/A')}")
        
        # 測試評估功能
        test_response = "Hello, my name is John. I am in grade 5."
        test_question = {'question': 'Please introduce yourself.', 'keywords': ['name', 'grade']}
        evaluation = manager.evaluate_response(test_response, test_question, 'A1')
        print(f"✅ 評估功能: 總分 {evaluation.get('overall_score', 0)}/10")
        
        print("🎉 測試版功能全部正常！")
        return True
        
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

if __name__ == "__main__":
    test_speaking_practice()
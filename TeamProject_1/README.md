1200單字檔案在test1檔案的data裡，叫jiba，先執行build_vector_db抓到叫jiba的檔案，他是utf-8編碼所以我們看不懂，就不用動他沒關係
database_config.json是放教材的路徑的地方
qa_system.py是看用誰的答案輸出，教材有就輸出教材的，反之用gemini輸出

要執行的話先執行build_vector_db，確定下面有輸出:
正在建立：vocabulary_1200 → C:/project/test1/data/jiba.csv
✅ [vocabulary_1200] 資料庫已建立 ➜ vector_db/jiba
其他沒抓到正常，然後執行interface_demo.py，他會給網址，打開後先到最下面的更新資料庫清單更新所有資料庫選項，再到上面勾vocabulary_1200就可以用
1200單我都重新用到vocabulary_1200了，

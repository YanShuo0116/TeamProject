document.addEventListener('DOMContentLoaded', function() {
    const steps = document.querySelectorAll('.step');
    const contents = document.querySelectorAll('.step-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const topicInput = document.getElementById('topic-input');
    const generateTopicBtn = document.getElementById('generate-topic-btn');
    const topicSpinner = document.getElementById('topic-spinner');
    let currentStep = 1;
    let selectedTopic = null;
    const form = document.getElementById('composition-form');
     const errorMessages = {
         '1': document.getElementById('step1-error'),
          '2': document.querySelectorAll('[id^="step2-error-"]'),
         '3': document.querySelectorAll('[id^="step3-error-"]'),
         '4': document.querySelectorAll('[id^="step4-error-"]')
    };

    function updateSteps() {
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        contents.forEach((content, index) => {
            if (index + 1 === currentStep) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        prevBtn.disabled = currentStep === 1;
        nextBtn.textContent = currentStep === 5 ? '完成' : '下一步';
    }

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateSteps();
        }
    });


    // 主題選擇
    const topicBtns = document.querySelectorAll('.topic-btn');
    topicBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            topicBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedTopic = btn.dataset.topic;
            topicInput.value = selectedTopic;
            topicBtns.forEach(b => {
                if (b !== btn) {
                    b.style.backgroundColor = '';
                    b.style.color = '';
                }
            });
             btn.style.backgroundColor = '#007BFF';
             btn.style.color = '#fff';
        });
    });
    generateTopicBtn.addEventListener('click', async () => {
        const topic = document.querySelector('.topic-btn.selected')?.dataset.topic;
        if (topic) {
            topicSpinner.style.display = 'inline-block';
            try {
                const response = await fetch('/composition?step=1', { method: 'POST' });
                if (response.ok) {
                    const data = await response.json(); // 假設後端返回 JSON
                    const generatedTopic = data.generated_topic; // 確保 JSON 包含題目
                    document.getElementById('essay-topic').value = generatedTopic; // 更新輸入框
                    topicInput.value = generatedTopic; // 更新隱藏的 input
                } else {
                    alert('生成題目失敗，請稍後再試。');
                }
            } catch (error) {
                console.error("發生錯誤:", error);
                alert('發生錯誤，請稍後再試。');
            } finally {
                topicSpinner.style.display = 'none';
            }
        } else {
            alert("請先選擇主題");
        }
    });
    
      function addEventListeners() {
          const topicBtns = document.querySelectorAll('.topic-btn');
          topicBtns.forEach(btn => {
             btn.addEventListener('click', () => {
                topicBtns.forEach(b => b.classList.remove('selected'));
                 btn.classList.add('selected');
                 selectedTopic = btn.dataset.topic;
                topicInput.value = selectedTopic;
                  topicBtns.forEach(b => {
                    if (b !== btn) {
                        b.style.backgroundColor = '';
                        b.style.color = '';
                    }
                });
                 btn.style.backgroundColor = '#007BFF';
                 btn.style.color = '#fff';
            });
        });
        const applyBtns = document.querySelectorAll('.apply-btn');
        applyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const value = btn.dataset.value;
                document.getElementById(targetId).value = value;
            });
        });
    }

    // 主題句反饋
    const topicSentenceInput = document.getElementById('topic-sentence-input');
    const feedbackContainer = document.querySelector('.feedback-container');

    if (topicSentenceInput) {
        topicSentenceInput.addEventListener('input', () => {
            const text = topicSentenceInput.value;
            if (text.length > 10) {
                feedbackContainer.textContent = '很好！主題句的長度合適。';
                feedbackContainer.className = 'feedback-container success';
            } else if (text.length > 0) {
                feedbackContainer.textContent = '主題句可能需要更詳細的描述。';
                feedbackContainer.className = 'feedback-container error';
            } else {
                feedbackContainer.className = 'feedback-container';
            }
        });
    }
    const refineEssayBtn = document.getElementById('refine-essay-btn');
    const refinedEssayContainer = document.getElementById('refined-essay-container');
    if (refineEssayBtn) {
        refineEssayBtn.addEventListener('click', () => {
            refinedEssayContainer.style.display = 'block';
        });
    }
     form.addEventListener('submit', async (event) => {
        event.preventDefault();
         let isValid = true;
          if (currentStep === 1) {
            const topic = document.querySelector('.topic-btn.selected');
            const essayTopic = document.getElementById('essay-topic').value;
            if (!topic && !essayTopic) {
                errorMessages['1'].style.display = 'block';
                isValid = false;
            } else {
                errorMessages['1'].style.display = 'none';
            }
        }  else if (currentStep === 2) {
            let allFilled = true;
             errorMessages['2'].forEach((error, index) => {
                 const input = document.getElementById(`keywords-input-${index + 1}`).value;
                 if (!input) {
                     error.style.display = 'block';
                     allFilled = false;
                 } else {
                     error.style.display = 'none';
                  }
               });
              if (!allFilled) {
                  isValid = false;
                }
         } else if (currentStep === 3) {
             let allFilled = true;
             errorMessages['3'].forEach((error, index) => {
                 const keyPoints =  document.querySelectorAll(`#step3 .keyword-input input`)[index].value;
                 if (!keyPoints) {
                     error.style.display = 'block';
                     allFilled = false;
                 } else {
                     error.style.display = 'none';
                }
            });
            if (!allFilled) {
                 isValid = false;
             }

        } else if (currentStep === 4) {
              let allFilled = true;
             errorMessages['4'].forEach((error, index) => {
                 const topicSentence = document.querySelectorAll('#step4 .topic-sentence textarea')[index].value;
                 if (!topicSentence) {
                     error.style.display = 'block';
                     allFilled = false;
                   }else{
                      error.style.display = 'none';
                    }
             });
            if(!allFilled){
                isValid = false;
            }
         }
         if (isValid) {
              const formData = new FormData(form);
             if (currentStep < 5) {
                  currentStep++;
                  updateSteps();
                   try {
                         const response = await fetch(`/composition?step=${currentStep}`, {
                              method: 'POST',
                              body: formData,
                         });
                      if (response.ok) {
                          const html = await response.text();
                           const parser = new DOMParser();
                           const doc = parser.parseFromString(html, 'text/html');
                            const newStepContent = doc.getElementById(`step${currentStep}`);
                           document.getElementById(`step${currentStep}`).innerHTML = newStepContent.innerHTML;
                            updateSteps();
                           addEventListeners();
                       } else {
                           alert('發生錯誤，請稍後再試。');
                       }
                    } catch (error) {
                        console.error("發生錯誤:", error);
                       alert('發生錯誤，請稍後再試。');
                    }
             }else{
                    try {
                         const response = await fetch(`/composition?step=5`, {
                             method: 'POST',
                            body: formData,
                          });
                       if (response.ok) {
                           const html = await response.text();
                           const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                           const newStepContent = doc.getElementById(`step5`);
                           document.getElementById(`step5`).innerHTML = newStepContent.innerHTML;
                           updateSteps();
                      } else {
                          alert('發生錯誤，請稍後再試。');
                       }
                     } catch (error) {
                         console.error("發生錯誤:", error);
                          alert('發生錯誤，請稍後再試。');
                     }
              }
        }
    });
    updateSteps();
    addEventListeners();
});
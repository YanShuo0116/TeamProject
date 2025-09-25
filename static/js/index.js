document.addEventListener('DOMContentLoaded', function() {
    const typingElement = document.querySelector('.typing-text');
    if (typingElement) {
        const texts = [
            "專為國小學童設計，激發學習興趣。",
            "互動式學習，讓英文不再枯燥。",
            "AI 智慧分析，提供個人化學習建議。",
            "從單字、口說到作文，全方位提升。"
        ];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function type() {
            const currentText = texts[textIndex];
            let displayText = '';
            
            if (isDeleting) {
                // Deleting
                displayText = currentText.substring(0, charIndex - 1);
                charIndex--;
            } else {
                // Typing
                displayText = currentText.substring(0, charIndex + 1);
                charIndex++;
            }

            typingElement.textContent = displayText;
            typingElement.style.borderRight = '2px solid orange'; // Show cursor while typing/deleting

            let typeSpeed = 150;
            if (isDeleting) {
                typeSpeed = 75;
            }

            // If text is fully typed
            if (!isDeleting && charIndex === currentText.length) {
                isDeleting = true;
                typeSpeed = 2000; // Pause at the end
                typingElement.style.borderRight = '2px solid transparent'; // Hide cursor during pause
            } 
            // If text is fully deleted
            else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                typeSpeed = 500; // Pause before typing new text
            }

            setTimeout(type, typeSpeed);
        }

        type();
    }
});
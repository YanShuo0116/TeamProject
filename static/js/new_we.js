// 團隊頁面的 JavaScript 腳本

$(document).ready(function() {
    // 預加載圖片
    preloadImages();
    
    // 載入動畫
    setTimeout(function() {
        $("#loading").fadeOut(500);
    }, 1000);
    
    // 初始化 particlesJS
    initParticles();
    
    // 預設為暗黑模式
    if (!localStorage.getItem('theme')) {
        localStorage.setItem('theme', 'dark');
        $('body').addClass('dark-mode').removeClass('light-mode');
    } else {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            $('body').addClass('dark-mode').removeClass('light-mode');
            $('#theme-toggle i').removeClass('fa-moon').addClass('fa-sun');
        } else {
            $('body').addClass('light-mode').removeClass('dark-mode');
            $('#theme-toggle i').removeClass('fa-sun').addClass('fa-moon');
        }
    }
    
    // 主題切換功能
    $('#theme-toggle').on('click', function(e) {
        e.preventDefault();
        if ($('body').hasClass('dark-mode')) {
            // 切換至亮色模式
            $('body').removeClass('dark-mode').addClass('light-mode');
            $(this).find('i').removeClass('fa-sun').addClass('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            // 切換至暗色模式
            $('body').removeClass('light-mode').addClass('dark-mode');
            $(this).find('i').removeClass('fa-moon').addClass('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });
    
    // 滾動特效
    $(window).scroll(function() {
        var scroll = $(window).scrollTop();
        
        // 導航欄變色
        if (scroll >= 50) {
            $('.navbar').addClass('scrolled');
        } else {
            $('.navbar').removeClass('scrolled');
        }
        
        // 進度條動畫
        var skillsTop = $('#about').offset().top - 600;
        if (scroll > skillsTop) {
            animateProgressBars();
        }
    });
    
    // 滑動切換
    $('a.nav-link, a.mouse-scroll').on('click', function(e) {
        if (this.hash !== '') {
            e.preventDefault();
            
            const hash = this.hash;
            
            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 800);
        }
    });
    
    // 團隊成員卡片懸停效果
    $('.team-member-card').hover(
        function() {
            $(this).find('.team-overlay').css('opacity', '1');
            $(this).find('.team-social').css({
                'opacity': '1',
                'transform': 'translateY(0)'
            });
        },
        function() {
            $(this).find('.team-overlay').css('opacity', '0');
            $(this).find('.team-social').css({
                'opacity': '0',
                'transform': 'translateY(20px)'
            });
        }
    );
    
    // 自動更新導航欄的活動狀態
    updateNavActiveState();
    $(window).scroll(updateNavActiveState);
});

// 預加載圖片函數
function preloadImages() {
    const images = [
        'assets/images/me.png',
        'assets/images/member2.jpg',
        'assets/images/member3.jpg',
        'assets/images/member4.jpg'
    ];
    
    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// 初始化粒子效果
function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 80,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#ffffff"
                },
                "shape": {
                    "type": "circle",
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    },
                    "polygon": {
                        "nb_sides": 5
                    }
                },
                "opacity": {
                    "value": 0.5,
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#ffffff",
                    "opacity": 0.4,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 2,
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    },
                    "onclick": {
                        "enable": true,
                        "mode": "push"
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 140,
                        "line_linked": {
                            "opacity": 1
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 200,
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    }
}

// 進度條動畫函數
function animateProgressBars() {
    $('.progress-bar').each(function() {
        var width = $(this).attr('aria-valuenow') + '%';
        if ($(this).width() == 0) {
            $(this).animate({
                width: width
            }, 1000);
        }
    });
}

// 更新導航欄選中狀態
function updateNavActiveState() {
    let scrollPosition = $(window).scrollTop() + 100;
    
    $('.navbar-nav .nav-link').each(function() {
        let target = $(this.hash);
        if (target.length && target.position().top <= scrollPosition && 
            target.position().top + target.outerHeight() > scrollPosition) {
            $('.navbar-nav .nav-item').removeClass('active');
            $(this).parent().addClass('active');
        }
    });
}

// 等待 DOM 完全加載
document.addEventListener('DOMContentLoaded', function() {
    // 導航欄滾動效果
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            navbar.style.padding = '0.5rem 2rem';
        } else {
            navbar.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            navbar.style.padding = '1rem 2rem';
        }
    });

    // 下拉按鈕功能
    const dropdownButtons = document.querySelectorAll('.dropdown-toggle');
    dropdownButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdownMenu = this.nextElementSibling;
            
            // 關閉其他打開的下拉選單
            dropdownButtons.forEach(otherButton => {
                if (otherButton !== this) {
                    otherButton.nextElementSibling.classList.remove('show');
                    otherButton.setAttribute('aria-expanded', 'false');
                }
            });

            // 切換當前下拉選單
            dropdownMenu.classList.toggle('show');
            const isExpanded = dropdownMenu.classList.contains('show');
            this.setAttribute('aria-expanded', isExpanded);
        });
    });

    // 點擊頁面其他地方時關閉下拉選單
    document.addEventListener('click', function(e) {
        if (!e.target.matches('.dropdown-toggle')) {
            dropdownButtons.forEach(button => {
                const dropdownMenu = button.nextElementSibling;
                if (dropdownMenu.classList.contains('show')) {
                    dropdownMenu.classList.remove('show');
                    button.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });

    // 頁面載入動畫
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }
}); 
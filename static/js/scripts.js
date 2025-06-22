// 漢堡選單控制
function toggleMenu() {
    const menu = document.getElementById('menu');
    const hamburger = document.getElementById('hamburgerMenu');
    menu.classList.toggle('open');
    hamburger.classList.toggle('open');
}

const links = document.querySelectorAll('.btn');
links.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        document.body.style.transition = 'opacity 0.5s';
        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = link.href;
        }, 500);
    });
});
const container = document.getElementById("starsContainer");

function createStar() {
    const star = document.createElement("div");
    star.classList.add("star");
    star.style.left = Math.random() * 100 + "vw";
    star.style.top = Math.random() * 100 + "vh";
    star.style.width = Math.random() * 3 + 1 + "px";
    star.style.height = star.style.width;
    star.style.animationDuration = Math.random() * 5 + 3 + "s";
    container.appendChild(star);

    // 星星動畫結束後刪除
    setTimeout(() => {
        star.remove();
    }, 3000);
}

// 每100毫秒創建一顆星星
setInterval(createStar, 400);

// 等待 DOM 完全加載
document.addEventListener('DOMContentLoaded', function() {
    // 初始化粒子效果
    initParticles();
    
    // 載入動畫
    setTimeout(function() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }, 1000);

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

    // 主題切換功能
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggle.querySelector('i');

    // 檢查本地存儲中的主題設置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.classList.add(savedTheme === 'dark' ? 'dark-mode' : 'light-mode');
        icon.classList.add(savedTheme === 'dark' ? 'fa-sun' : 'fa-moon');
    } else {
        // 預設為暗色模式
        body.classList.add('dark-mode');
        icon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    }

    // 主題切換點擊事件
    themeToggle.addEventListener('click', function(e) {
        e.preventDefault();
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });
});

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
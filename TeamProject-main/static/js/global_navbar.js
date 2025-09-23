/**
 * 全域導覽列功能
 * 統一所有頁面的導覽列行為
 */

document.addEventListener('DOMContentLoaded', function() {
    // 導覽列滾動效果
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        // 滾動監聽
        let lastScrollTop = 0;
        
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // 添加滾動樣式
            if (scrollTop > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
            
            lastScrollTop = scrollTop;
        });
        
        // 導覽列項目點擊平滑滾動
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // 如果是錨點連結，添加平滑滾動
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const offsetTop = target.offsetTop - 80; // 考慮導覽列高度
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
        
        // 手機版導覽列收合
        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        if (navbarToggler && navbarCollapse) {
            // 點擊連結後自動收合手機版選單
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth < 992) {
                        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
                            hide: true
                        });
                    }
                });
            });
            
            // 點擊外部區域收合選單
            document.addEventListener('click', function(e) {
                if (window.innerWidth < 992) {
                    if (!navbar.contains(e.target) && navbarCollapse.classList.contains('show')) {
                        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
                            hide: true
                        });
                    }
                }
            });
        }
    }
    
    // 設置當前頁面的活躍狀態
    setActiveNavItem();
    
    // 載入動畫
    animateNavbarItems();
});

/**
 * 設置當前頁面的導覽項目為活躍狀態
 */
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        // 精確匹配或部分匹配
        if (href === currentPath || (href !== '/' && currentPath.includes(href))) {
            link.classList.add('active');
        }
    });
    
    // 特殊處理首頁
    if (currentPath === '/' || currentPath === '/index') {
        const homeLink = document.querySelector('.navbar-nav .nav-link[href="/"]');
        if (homeLink) {
            homeLink.classList.add('active');
        }
    }
}

/**
 * 導覽列項目載入動畫
 */
function animateNavbarItems() {
    const navItems = document.querySelectorAll('.navbar-nav .nav-item');
    
    navItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.6s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
}

/**
 * 響應式導覽列調整
 */
function handleResponsiveNavbar() {
    const navbar = document.querySelector('.navbar');
    const navbarBrand = document.querySelector('.navbar-brand');
    
    function updateNavbar() {
        if (window.innerWidth < 768) {
            // 手機版調整
            if (navbar) {
                navbar.style.padding = '0.5rem 1rem';
            }
            if (navbarBrand) {
                navbarBrand.style.fontSize = '1.1rem';
            }
        } else {
            // 桌面版恢復
            if (navbar) {
                navbar.style.padding = '';
            }
            if (navbarBrand) {
                navbarBrand.style.fontSize = '';
            }
        }
    }
    
    // 初始調整
    updateNavbar();
    
    // 監聽視窗大小變化
    window.addEventListener('resize', updateNavbar);
}

// 初始化響應式功能
handleResponsiveNavbar();

/**
 * 導覽列搜尋功能（如果需要的話）
 */
function initNavbarSearch() {
    const searchInput = document.querySelector('.navbar-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            // 這裡可以添加搜尋邏輯
            console.log('搜尋:', query);
        });
    }
}

// 導出函數供其他腳本使用
window.setActiveNavItem = setActiveNavItem;
window.animateNavbarItems = animateNavbarItems;
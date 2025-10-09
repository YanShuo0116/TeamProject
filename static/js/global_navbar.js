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
            // 點擊連結後自動收合手機版選單（排除下拉開關）
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    // 若為下拉開關，則不收合主選單，交由 Bootstrap 自己處理下拉
                    const isDropdownToggle = link.classList.contains('dropdown-toggle') || link.getAttribute('data-toggle') === 'dropdown';
                    if (isDropdownToggle) {
                        return;
                    }

                    if (window.innerWidth < 992) {
                        const bsCollapse = new bootstrap.Collapse(navbarCollapse, { hide: true });
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

/**
 * 顯示一個全域的成功提示訊息 (Toast)
 * @param {string} message 要顯示的訊息
 */
function showSuccessToast(message) {
    // 檢查容器是否存在，若否則建立一個
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // 建立 toast 元素
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    // 加入到容器中
    container.appendChild(toast);

    // 動畫結束後自動移除元素
    toast.addEventListener('animationend', (e) => {
        // 確保是 fadeOut 動畫結束
        if (e.animationName === 'fadeOut') {
            toast.remove();
            // 如果容器空了，也可以選擇移除容器
            if (container.children.length === 0) {
                container.remove();
            }
        }
    });
}

// 將新函式也掛到 window 上，確保全域可訪問
window.showSuccessToast = showSuccessToast;

/**
 * 顯示一個全域的錯誤提示 Modal
 * @param {string} message 要顯示的錯誤訊息
 */
function showErrorModal(message) {
    // 移除已存在的 Modal，避免重複
    const existingModal = document.getElementById('globalErrorModal');
    if (existingModal) {
        existingModal.remove();
    }

    // 動態建立 Modal 的 HTML
    const modalHTML = `
        <div class="modal fade" id="globalErrorModal" tabindex="-1" aria-labelledby="globalErrorModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-dark text-white border-danger">
                    <div class="modal-header">
                        <h5 class="modal-title text-danger" id="globalErrorModalLabel">
                            <i class="fas fa-exclamation-triangle"></i> 操作失敗
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 將 Modal HTML 注入到 body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 獲取並顯示 Modal
    const errorModalElement = document.getElementById('globalErrorModal');
    const modal = new bootstrap.Modal(errorModalElement);
    modal.show();

    // 在 Modal 關閉後自動從 DOM 中移除，保持頁面乾淨
    errorModalElement.addEventListener('hidden.bs.modal', function () {
        errorModalElement.remove();
    });
}

// 將錯誤 Modal 函式也掛到 window 上
window.showErrorModal = showErrorModal;

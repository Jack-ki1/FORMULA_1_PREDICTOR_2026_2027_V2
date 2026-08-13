// Theme toggle functionality - mirrors the JSX's Proxy-based theme system

class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('f1-theme') || 'light';
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.createToggleButton();
    }
    
    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('f1-theme', theme);
        
        // Update CSS variables
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--f1-bg', '#0A0C10');
            document.documentElement.style.setProperty('--f1-surface', '#15181F');
            document.documentElement.style.setProperty('--f1-border', '#2B3039');
            document.documentElement.style.setProperty('--f1-text', '#F1F2F5');
            document.documentElement.style.setProperty('--f1-sub', '#9BA2AF');
        } else {
            document.documentElement.style.setProperty('--f1-bg', '#F4F5F7');
            document.documentElement.style.setProperty('--f1-surface', '#FFFFFF');
            document.documentElement.style.setProperty('--f1-border', '#E3E5EA');
            document.documentElement.style.setProperty('--f1-text', '#15151E');
            document.documentElement.style.setProperty('--f1-sub', '#6B7280');
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }
    
    createToggleButton() {
        // Find or create theme toggle button
        let toggleBtn = document.getElementById('theme-toggle');
        
        if (!toggleBtn) {
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'theme-toggle';
            toggleBtn.className = 'theme-toggle';
            toggleBtn.innerHTML = this.currentTheme === 'light' ? '🌙' : '☀️';
            toggleBtn.title = 'Toggle theme';
            
            // Add to navbar
            const navbar = document.querySelector('.nav-container');
            if (navbar) {
                navbar.appendChild(toggleBtn);
            }
            
            toggleBtn.addEventListener('click', () => {
                const newTheme = this.toggleTheme();
                toggleBtn.innerHTML = newTheme === 'light' ? '🌙' : '☀️';
            });
        }
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}

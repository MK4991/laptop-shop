
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// Get the saved theme, or use light mode by default
const savedTheme = localStorage.getItem('theme') || 'light';

// Apply the selected theme
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    if (theme === 'dark') {
        themeIcon.textContent = '☀';
        themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
        themeIcon.textContent = '☾';
        themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
}

// Apply the saved theme when the page loads
applyTheme(savedTheme);

// Switch themes when the button is clicked
themeToggle.addEventListener('click', () => {
    const currentTheme =
        document.documentElement.getAttribute('data-theme');

    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    localStorage.setItem('theme', newTheme);

    applyTheme(newTheme);
});

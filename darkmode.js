// Get the toggle element
const toggleButton = document.getElementById('lightdarktoggle');

// Function to set theme
function setTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
    localStorage.setItem('theme', 'dark');
    toggleButton.querySelector('img').src = 'lightbulb_24dp_666666_FILL0_wght400_GRAD0_opsz24.svg';
  } else {
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
    toggleButton.querySelector('img').src = 'lightbulb_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg';
  }
}

// Function to toggle theme
function toggleTheme() {
  const isDarkMode = document.body.classList.contains('dark-theme');
  setTheme(!isDarkMode);
}

// Initialize theme based on user preference or stored setting
const storedTheme = localStorage.getItem('theme');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Set initial theme
if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
  setTheme(true);
} else {
  setTheme(false);
}

// Listen for changes in user preference
prefersDarkScheme.addEventListener('change', (e) => {
  setTheme(e.matches);
});

// Add click event listener to the toggle button
toggleButton.addEventListener('click', toggleTheme);
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        'text-muted': "var(--text-muted)",
        primary: "var(--primary)",
        'primary-contrast': "var(--primary-contrast)",
        border: "var(--border)",
        danger: "var(--danger)",
        success: "var(--success)"
      }
    }
  },
  plugins: []
};
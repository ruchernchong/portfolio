/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            "code::before": {
              content: "none",
            },
            "code::after": {
              content: "none",
            },
            code: {
              color: theme("colors.neutral.500"),
              backgroundColor: theme("colors.neutral.200"),
              borderRadius: theme("borderRadius.DEFAULT"),
              paddingLeft: theme("spacing[1.5]"),
              paddingRight: theme("spacing[1.5]"),
              paddingTop: theme("spacing.1"),
              paddingBottom: theme("spacing.1"),
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

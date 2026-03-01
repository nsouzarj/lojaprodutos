import containerQueries from '@tailwindcss/container-queries';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./PORTAL_ROOT_INDEX.html",
        "./src/**/*.{vue,js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "hsl(var(--accent-color))",
                "primary-hover": "hsl(var(--accent-dark))",
                "surface-dynamic": "rgb(var(--tw-surface) / <alpha-value>)",
                "border-dynamic": "rgb(var(--tw-border) / <alpha-value>)",
                "text-main": "rgb(var(--tw-text-main) / <alpha-value>)",
                "text-muted": "rgb(var(--tw-text-muted) / <alpha-value>)",
                "secondary": "hsl(var(--bg-secondary) / <alpha-value>)",
                "background": "hsl(var(--bg-primary) / <alpha-value>)",
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            }
        },
    },
    plugins: [
        containerQueries,
        forms,
    ],
}

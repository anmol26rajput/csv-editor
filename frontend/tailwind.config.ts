import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)", "system-ui", "sans-serif"],
                mono: ["var(--font-mono)", "ui-monospace", "monospace"],
            },
            colors: {
                brand: {
                    50: "#fbf5ef",
                    100: "#f5e6d5",
                    200: "#eaccab",
                    300: "#ddab77",
                    400: "#d0884b",
                    500: "#c66e33",
                    600: "#b45726",
                    700: "#964322",
                    800: "#7a3721",
                    900: "#642f1e",
                    950: "#36160d",
                },
                ink: {
                    50: "#f7f6f4",
                    100: "#eceae6",
                    200: "#d8d4cd",
                    300: "#bcb6ac",
                    400: "#9c948a",
                    500: "#847c71",
                    600: "#6d6459",
                    700: "#59524a",
                    800: "#4a453f",
                    900: "#403c37",
                    950: "#211e1b",
                },
                paper: "#faf8f5",
            },
            boxShadow: {
                card: "0 1px 2px rgba(54, 22, 13, 0.04), 0 4px 16px rgba(54, 22, 13, 0.06)",
                lift: "0 2px 4px rgba(54, 22, 13, 0.05), 0 12px 32px rgba(54, 22, 13, 0.10)",
                inset: "inset 0 1px 2px rgba(54, 22, 13, 0.06)",
            },
            keyframes: {
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "rise-in": {
                    from: { opacity: "0", transform: "translateY(12px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.4s ease both",
                "rise-in": "rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
            },
        },
    },
    plugins: [],
};
export default config;

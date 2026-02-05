import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Porting colors from original CSS
                bg: "var(--bg)",
                card: "var(--card)",
                link: "var(--link)",
                text: "var(--text)",
                muted: "var(--muted)",
                accent: "var(--accent)",
            },
        },
    },
    plugins: [],
};
export default config;

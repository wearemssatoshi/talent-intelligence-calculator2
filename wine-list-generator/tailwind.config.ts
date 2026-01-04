import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-noto-sans-jp)", "sans-serif"],
                serif: ["var(--font-noto-serif-jp)", "serif"],
            },
            colors: {
                gold: {
                    50: '#fbf8f1',
                    100: '#f5edd6',
                    200: '#ebd9aa',
                    300: '#dfc076',
                    400: '#d4a74c',
                    500: '#c68e36',
                    600: '#aa6f2b',
                    700: '#885426',
                    800: '#704325',
                    900: '#5d3822',
                },
            },
        },
    },
    plugins: [],
};
export default config;

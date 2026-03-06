/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                brand: { 500: '#1A56A0', 600: '#164B8C' },
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
            },
        },
    },
    plugins: [],
};

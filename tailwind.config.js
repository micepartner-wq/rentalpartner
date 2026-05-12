/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#001E45',
                    50: '#E8EDF4',
                    100: '#D1DCE8',
                    200: '#A3B9D1',
                    300: '#7596BA',
                    400: '#4773A3',
                    500: '#001E45',    // Main brand color
                    600: '#00183A',
                    700: '#00122E',
                    800: '#000C23',
                    900: '#000617',
                }
            },
            keyframes: {
                slideInRight: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            },
            animation: {
                slideInRight: 'slideInRight 0.3s ease-out forwards',
                fadeIn: 'fadeIn 0.2s ease-out forwards',
            }
        },
    },
    plugins: [
        require('tailwind-scrollbar-hide')
    ],
}

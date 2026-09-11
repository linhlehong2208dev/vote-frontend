// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nền — redesign sáng màu, trắng chủ đạo.
        stage: {
          950: "#FFFFFF", // nền trang
          900: "#FFFFFF", // bề mặt chính
          800: "#FFF4F4", // bề mặt card (trắng ngả đỏ nhạt)
          700: "#FFE1E3", // viền / hover
          600: "#FFC7CB", // viền đậm hơn / divider
        },
        // Chữ — thay thế text-white/xx của theme tối cũ.
        ink: {
          900: "#161616", // chữ chính
          700: "#3A3A3C", // chữ phụ
          500: "#6E6E73", // chữ mờ
          300: "#B8B8BD", // placeholder / disabled
        },
        amber: { DEFAULT: "#E4002B" }, // đỏ chủ đạo (brand)
        coral: { DEFAULT: "#FF3B30" }, // đỏ khẩn cấp / cảnh báo
        sky: { DEFAULT: "#1C1C1E" }, // đen / trạng thái phụ
        emerald: { DEFAULT: "#7A0C2E" }, // đỏ mận / trạng thái tích cực
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Montserrat", "sans-serif"],
      },
      boxShadow: {
        tile: "0 6px 0 0 rgba(22,22,22,0.18)",
        "tile-active": "0 2px 0 0 rgba(22,22,22,0.18)",
      },
      keyframes: {
        pulseSlow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
        popIn: {
          "0%": { transform: "scale(0.85)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        pageIn: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        dotBounce: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: 0.5 },
          "40%": { transform: "scale(1)", opacity: 1 },
        },
      },
      animation: {
        pulseSlow: "pulseSlow 2s ease-in-out infinite",
        popIn: "popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        pageIn: "pageIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        dotBounce: "dotBounce 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

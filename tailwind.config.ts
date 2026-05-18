import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#060708",
        graphite: {
          950: "#090a0b",
          900: "#101214",
          800: "#171a1d",
          700: "#1f2428"
        },
        mist: {
          50: "#f9f7f4",
          100: "#efeae4",
          200: "#d8d1ca",
          300: "#b8b0aa"
        },
        coral: {
          300: "#ff8474",
          400: "#ff6c59",
          500: "#ef5a4c"
        }
      },
      boxShadow: {
        shell: "0 18px 50px rgba(0, 0, 0, 0.34)",
        card: "0 12px 30px rgba(0, 0, 0, 0.22)"
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        pulseBorder: {
          "0%, 100%": { borderColor: "rgba(255,255,255,0.08)" },
          "50%": { borderColor: "rgba(239,90,76,0.55)" }
        }
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "pulse-border": "pulseBorder 4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;

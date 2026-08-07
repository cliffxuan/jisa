import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev only: proxy API calls to the FastAPI backend (run `uvicorn main:app`).
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
});

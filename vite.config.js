import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), ["REACT_APP_", "VITE_"]);
    return {
        plugins: [react()],
        envPrefix: ["VITE_", "REACT_APP_"],
        build: {
            outDir: "build",
        },
        server: {
            proxy: {
                "/relay": {
                    target: env.REACT_APP_RELAY_TARGET,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/relay/, "/api"),
                },
            },
        },
    };
});

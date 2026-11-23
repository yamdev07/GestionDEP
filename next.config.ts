import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome : image Docker légère, ne copie que le nécessaire.
  output: "standalone",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

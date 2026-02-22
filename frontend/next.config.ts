import type { NextConfig } from "next";

const DEV_IGNORED_PATHS = [
  "**/node_modules/**",
  "**/node_modules_corrupt_*/**",
  "**/corrupt_backup*/**",
  "**/venv*/**",
  "**/.venv*/**",
  "**/__pycache__/**",
];

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.watchOptions = {
        ...config.watchOptions,
        ignored: DEV_IGNORED_PATHS,
      };
    }
    return config;
  },
};

export default nextConfig;

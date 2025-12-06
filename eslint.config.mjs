import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/dist-electron/**",
      "**/docs-reference/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },
];

export default eslintConfig;

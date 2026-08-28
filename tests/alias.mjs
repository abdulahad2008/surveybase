// Teaches `node --test` the "@/..." alias that tsconfig.json gives the app.
//
// A test runner is a dependency decision, and this repo does not need one: Node
// runs TypeScript directly and ships `node:test`, so the only thing missing was
// path resolution. Fifteen lines here is a smaller commitment than a framework.

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = new URL("../src/", import.meta.url);
const EXTENSIONS = ["", ".ts", ".tsx", ".mts", "/index.ts", "/index.tsx"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

    const base = new URL(specifier.slice(2), src);
    for (const extension of EXTENSIONS) {
      const candidate = new URL(base.href + extension);
      if (existsSync(fileURLToPath(candidate))) {
        // Declaring the format keeps Node from reparsing each file to discover
        // it is ESM, which it otherwise warns about once per file.
        return { url: candidate.href, format: "module-typescript", shortCircuit: true };
      }
    }
    throw new Error(`Cannot resolve "${specifier}" under ${pathToFileURL(src.pathname)}`);
  },
});

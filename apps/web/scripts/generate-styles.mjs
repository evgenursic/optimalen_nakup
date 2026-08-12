import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { transform } from "lightningcss";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const webDirectory = fileURLToPath(new URL("..", import.meta.url));
const sourcePath = path.join(webDirectory, "app", "globals.css");
const outputPath = path.join(webDirectory, "public", "styles.generated.css");

const source = await readFile(sourcePath, "utf8");
const expanded = await postcss([tailwindcss()]).process(source, {
  from: sourcePath,
  to: outputPath,
});
const minified = transform({
  code: Buffer.from(expanded.css),
  minify: true,
  sourceMap: false,
});

await writeFile(outputPath, minified.code);

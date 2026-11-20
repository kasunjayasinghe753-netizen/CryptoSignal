import { cpSync, mkdirSync, rmSync } from "node:fs";

const files = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "icon.svg",
  "sw.js"
];

rmSync("www", { recursive: true, force: true });
mkdirSync("www", { recursive: true });

for (const file of files) {
  cpSync(file, `www/${file}`);
}

console.log("Web assets prepared for CRYPTOSIGNAL46 Android.");

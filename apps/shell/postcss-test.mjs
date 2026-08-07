import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import fs from "node:fs";

const css = fs.readFileSync("app/globals.css", "utf8");
const result = await postcss([tailwindcss()]).process(css, { from: "app/globals.css" });
console.log("CSS OUTPUT LENGTH:", result.css.length);
fs.writeFileSync("/tmp/opencode/test-shell.css", result.css);
console.log("OK - sin errores");

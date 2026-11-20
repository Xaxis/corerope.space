#!/usr/bin/env node
// The owner's rule (00-BRIEF.md, "Writing style"): no em dashes anywhere, in research text, docs, code or UI copy. Lists every one in
// the files git tracks or would add, and fails if any exist.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (f) =>
      f && !/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|lock)$/i.test(f) && f !== "pnpm-lock.yaml",
  );
const DASH = String.fromCharCode(0x2014);
let found = 0;
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  if (!text.includes(DASH)) continue;
  text.split("\n").forEach((line, i) => {
    if (line.includes(DASH)) {
      found++;
      console.error(`${f}:${i + 1}: em dash: ${line.trim().slice(0, 120)}`);
    }
  });
}
if (found) {
  console.error(
    `no-em-dash: ${found} em dash${found === 1 ? "" : "es"}. Use a comma, colon, parentheses or a new sentence.`,
  );
  process.exit(1);
}

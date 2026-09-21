// Copia courses/<curso>/assets/* para public/course-assets/<curso>/*
// para que as imagens fiquem junto do conteúdo e ainda sejam servidas pelo Next.
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "courses");
const target = path.join(root, "public", "course-assets");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

let copied = 0;
for (const entry of await readdir(source, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const assets = path.join(source, entry.name, "assets");
  try {
    await stat(assets);
  } catch {
    continue;
  }
  await cp(assets, path.join(target, entry.name), { recursive: true });
  copied += 1;
}

console.log(`[cursos] assets sincronizados (${copied} curso${copied === 1 ? "" : "s"})`);

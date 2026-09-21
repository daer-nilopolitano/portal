import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { readingMinutes } from "./text";
import type { ChapterFile, Course, CourseFile } from "./types";

const COURSES_DIR = path.join(process.cwd(), "courses");

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch (error) {
    const where = path.relative(process.cwd(), file);
    throw new Error(
      `[cursos] Não foi possível ler ${where}: ${(error as Error).message}`,
    );
  }
}

export function getCourseSlugs(): string[] {
  if (!fs.existsSync(COURSES_DIR)) return [];
  return fs
    .readdirSync(COURSES_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(COURSES_DIR, entry.name, "course.json")),
    )
    .map((entry) => entry.name);
}

export const getCourse = cache((slug: string): Course | null => {
  // Só aceita slugs que existem como pasta em courses/ (evita path traversal).
  if (!getCourseSlugs().includes(slug)) return null;

  const dir = path.join(COURSES_DIR, slug);
  const meta = readJson<CourseFile>(path.join(dir, "course.json"));
  const status = meta.status ?? "published";

  const chapters =
    status === "soon"
      ? []
      : (meta.chapters ?? []).map((chapterSlug, index) => {
          const data = readJson<ChapterFile>(
            path.join(dir, "chapters", `${chapterSlug}.json`),
          );
          return {
            ...data,
            slug: chapterSlug,
            number: index + 1,
            minutes: readingMinutes(data.blocks),
          };
        });

  return {
    ...meta,
    slug,
    status,
    order: meta.order ?? 100,
    chapters,
    totalMinutes: chapters.reduce((sum, chapter) => sum + chapter.minutes, 0),
  };
});

export function getCourses(): Course[] {
  return getCourseSlugs()
    .map((slug) => getCourse(slug))
    .filter((course): course is Course => course !== null)
    .sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, "pt-BR"),
    );
}

export function getPublishedCourses(): Course[] {
  return getCourses().filter((course) => course.status === "published");
}

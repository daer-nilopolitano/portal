import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseLayout from "../../_components/CourseLayout";
import LessonPage from "../../_components/LessonPage";
import { getCourse, getPublishedCourses } from "../../_lib/courses";
import { collectHeadings } from "../../_lib/text";

type Params = Promise<{ curso: string; capitulo: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedCourses().flatMap((course) =>
    course.chapters.map((chapter) => ({
      curso: course.slug,
      capitulo: chapter.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { curso, capitulo } = await params;
  const course = getCourse(curso);
  const chapter = course?.chapters.find((c) => c.slug === capitulo);
  if (!course || !chapter) return {};
  return {
    title: `${chapter.title} | ${course.title}`,
    description: chapter.summary,
  };
}

export default async function ChapterPage({
  params,
}: Readonly<{ params: Params }>) {
  const { curso, capitulo } = await params;
  const course = getCourse(curso);
  const chapter = course?.chapters.find((c) => c.slug === capitulo);
  if (!course || !chapter || course.status !== "published") notFound();

  const sections = collectHeadings(chapter.blocks)
    .filter((heading) => heading.level === 2)
    .map(({ id, title }) => ({ id, title }));

  return (
    <CourseLayout
      course={course}
      activeChapterSlug={chapter.slug}
      sections={sections}
    >
      <LessonPage course={course} chapter={chapter} />
    </CourseLayout>
  );
}

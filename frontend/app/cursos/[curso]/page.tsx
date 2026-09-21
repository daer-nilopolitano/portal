import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseHeader from "../_components/CourseHeader";
import CourseLayout from "../_components/CourseLayout";
import CourseToc from "../_components/CourseToc";
import { getCourse, getPublishedCourses } from "../_lib/courses";

type Params = Promise<{ curso: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedCourses().map((course) => ({ curso: course.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { curso } = await params;
  const course = getCourse(curso);
  return course ? { title: course.title, description: course.subtitle } : {};
}

export default async function CoursePage({
  params,
}: Readonly<{ params: Params }>) {
  const { curso } = await params;
  const course = getCourse(curso);
  if (!course || course.status !== "published") notFound();

  return (
    <CourseLayout course={course}>
      <div className="c-column">
        <CourseHeader course={course} />
        <CourseToc course={course} />
        {course.about && (
          <footer className="c-about">
            <h2 className="c-about__title">Sobre este material</h2>
            <p>{course.about}</p>
          </footer>
        )}
      </div>
    </CourseLayout>
  );
}

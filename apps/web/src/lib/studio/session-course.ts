import type { StudioCourse, StudioLesson, StudioModule } from './types';

const STORAGE_PREFIX = 'smartklass-studio-course:';

export function saveStudioCourse(course: StudioCourse): void {
  if (typeof window === 'undefined') {
    return;
  }

  const key = `${STORAGE_PREFIX}${course.id}`;
  const serialized = JSON.stringify(course);
  sessionStorage.setItem(key, serialized);
  localStorage.setItem(key, serialized);
}

export function loadStudioCourse(id: string): StudioCourse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = `${STORAGE_PREFIX}${id}`;
  const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StudioCourse;
  } catch {
    return null;
  }
}

type UpsertModuleOptions = {
  courseTitle?: string;
  replaceModuleId?: string;
};

function createEmptyStudioCourse(courseId: string, courseTitle: string): StudioCourse {
  return {
    id: courseId,
    slug: '',
    title: courseTitle,
    subtitle: null,
    description: '',
    status: 'DRAFT',
    thumbnailUrl: null,
    trailerYoutubeId: null,
    trailerYoutubeUrl: null,
    previewMaterialsDescription: null,
    estimatedHours: null,
    difficultyLevel: 'Beginner',
    lessonCount: 0,
    moduleCount: 0,
    studentCount: 0,
    revenueCents: 0,
    rating: 0,
    modules: [],
    offersCertificate: false,
    certificatePaidAt: null,
  };
}

function withModuleStats(course: StudioCourse, modules: StudioModule[]): StudioCourse {
  const lessonCount = modules.reduce((total, item) => total + item.lessons.length, 0);

  return {
    ...course,
    modules,
    moduleCount: modules.length,
    lessonCount,
  };
}

export function upsertStudioCourseModule(
  courseId: string,
  module: StudioModule,
  options: UpsertModuleOptions = {},
): boolean {
  let course = loadStudioCourse(courseId);

  if (!course && options.courseTitle) {
    course = createEmptyStudioCourse(courseId, options.courseTitle);
  }

  if (!course) {
    return false;
  }

  let modules = course.modules;
  const replaceModuleId = options.replaceModuleId;

  if (replaceModuleId) {
    const hasReplacement = modules.some((item) => item.id === replaceModuleId);
    modules = hasReplacement
      ? modules.map((item) => (item.id === replaceModuleId ? module : item))
      : [...modules, module];
  } else if (modules.some((item) => item.id === module.id)) {
    modules = modules.map((item) => (item.id === module.id ? module : item));
  } else {
    modules = [...modules, module];
  }

  saveStudioCourse(withModuleStats(course, modules));
  return true;
}

export function updateStudioCourseModule(
  courseId: string,
  module: StudioModule,
  options: UpsertModuleOptions = {},
): void {
  upsertStudioCourseModule(courseId, module, options);
}

type UpsertLessonOptions = {
  courseTitle?: string;
  replaceLessonId?: string;
};

export function upsertStudioCourseLesson(
  courseId: string,
  lesson: StudioLesson,
  options: UpsertLessonOptions = {},
): boolean {
  let course = loadStudioCourse(courseId);

  if (!course && options.courseTitle) {
    course = createEmptyStudioCourse(courseId, options.courseTitle);
  }

  if (!course) {
    return false;
  }

  let lessonUpserted = false;
  const modules = course.modules.map((module) => {
    if (module.id !== lesson.moduleId) {
      return module;
    }

    let lessons = module.lessons;
    const replaceLessonId = options.replaceLessonId;

    if (replaceLessonId) {
      const hasReplacement = lessons.some((item) => item.id === replaceLessonId);
      lessons = hasReplacement
        ? lessons.map((item) => (item.id === replaceLessonId ? lesson : item))
        : [...lessons, lesson];
    } else if (lessons.some((item) => item.id === lesson.id)) {
      lessons = lessons.map((item) => (item.id === lesson.id ? lesson : item));
    } else {
      lessons = [...lessons, lesson];
    }

    lessonUpserted = true;
    return { ...module, lessons };
  });

  if (!lessonUpserted) {
    return false;
  }

  saveStudioCourse(withModuleStats(course, modules));
  return true;
}

export function updateStudioCourseLesson(
  courseId: string,
  lesson: StudioLesson,
  options: UpsertLessonOptions = {},
): void {
  upsertStudioCourseLesson(courseId, lesson, options);
}

import { Prisma } from '@smartklass/database';
import type {
  CourseSnapshotAccessPlan,
  CourseSnapshotData,
  CourseSnapshotLesson,
  CourseSnapshotModule,
  CourseSnapshotResource,
} from './course-version-snapshot.types';

type Tx = Prisma.TransactionClient;

function parseSnapshot(raw: unknown): CourseSnapshotData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid course version snapshot.');
  }
  return raw as CourseSnapshotData;
}

export async function applyCourseSnapshot(
  tx: Tx,
  courseId: string,
  rawSnapshot: unknown,
): Promise<void> {
  const snapshot = parseSnapshot(rawSnapshot);
  const now = new Date();

  await tx.course.update({
    where: { id: courseId },
    data: {
      title: snapshot.course.title,
      subtitle: snapshot.course.subtitle,
      description: snapshot.course.description,
      thumbnailUrl: snapshot.course.thumbnailUrl,
      trailerYoutubeId: snapshot.course.trailerYoutubeId,
      previewMaterialsDescription: snapshot.course.previewMaterialsDescription,
      estimatedHours:
        snapshot.course.estimatedHours != null
          ? Number(snapshot.course.estimatedHours)
          : null,
      difficultyLevel: snapshot.course.difficultyLevel as never,
      language: snapshot.course.language,
      offersCertificate: snapshot.course.offersCertificate,
    },
  });

  const moduleIds = snapshot.modules.map((m) => m.id);
  const lessonIds = snapshot.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const resourceIds = snapshot.modules.flatMap((m) =>
    m.lessons.flatMap((l) => l.resources.map((r) => r.id)),
  );
  const planIds = snapshot.accessPlans.map((p) => p.id);

  await tx.courseModule.updateMany({
    where: {
      courseId,
      deletedAt: null,
      ...(moduleIds.length > 0 ? { id: { notIn: moduleIds } } : {}),
    },
    data: { deletedAt: now },
  });

  if (lessonIds.length > 0) {
    await tx.lesson.updateMany({
      where: {
        module: { courseId },
        deletedAt: null,
        id: { notIn: lessonIds },
      },
      data: { deletedAt: now },
    });
  } else {
    await tx.lesson.updateMany({
      where: {
        module: { courseId },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });
  }

  if (resourceIds.length > 0) {
    await tx.lessonResource.updateMany({
      where: {
        lesson: { module: { courseId } },
        deletedAt: null,
        id: { notIn: resourceIds },
      },
      data: { deletedAt: now },
    });
  } else {
    await tx.lessonResource.updateMany({
      where: {
        lesson: { module: { courseId } },
        deletedAt: null,
      },
      data: { deletedAt: now },
    });
  }

  await tx.accessPlan.updateMany({
    where: {
      courseId,
      deletedAt: null,
      ...(planIds.length > 0 ? { id: { notIn: planIds } } : {}),
    },
    data: { deletedAt: now },
  });

  for (const mod of snapshot.modules) {
    await upsertModule(tx, courseId, mod);
  }

  for (const plan of snapshot.accessPlans) {
    await upsertAccessPlan(tx, courseId, plan);
  }
}

async function upsertModule(
  tx: Tx,
  courseId: string,
  mod: CourseSnapshotModule,
) {
  await tx.courseModule.upsert({
    where: { id: mod.id },
    create: {
      id: mod.id,
      courseId,
      title: mod.title,
      description: mod.description,
      sortOrder: mod.sortOrder,
    },
    update: {
      title: mod.title,
      description: mod.description,
      sortOrder: mod.sortOrder,
      deletedAt: null,
    },
  });

  for (const lesson of mod.lessons) {
    await upsertLesson(tx, mod.id, lesson);
  }
}

async function upsertLesson(
  tx: Tx,
  moduleId: string,
  lesson: CourseSnapshotLesson,
) {
  await tx.lesson.upsert({
    where: { id: lesson.id },
    create: {
      id: lesson.id,
      moduleId,
      title: lesson.title,
      description: lesson.description,
      materialsDescription: lesson.materialsDescription,
      youtubeVideoId: lesson.youtubeVideoId,
      youtubeUrl: lesson.youtubeUrl,
      status: lesson.status as never,
      sortOrder: lesson.sortOrder,
      durationSeconds:
        lesson.durationMinutes != null ? lesson.durationMinutes * 60 : null,
    },
    update: {
      title: lesson.title,
      description: lesson.description,
      materialsDescription: lesson.materialsDescription,
      youtubeVideoId: lesson.youtubeVideoId,
      youtubeUrl: lesson.youtubeUrl,
      status: lesson.status as never,
      sortOrder: lesson.sortOrder,
      durationSeconds:
        lesson.durationMinutes != null ? lesson.durationMinutes * 60 : null,
      deletedAt: null,
    },
  });

  for (const resource of lesson.resources) {
    await upsertResource(tx, lesson.id, resource);
  }
}

async function upsertResource(
  tx: Tx,
  lessonId: string,
  resource: CourseSnapshotResource,
) {
  await tx.lessonResource.upsert({
    where: { id: resource.id },
    create: {
      id: resource.id,
      lessonId,
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType as never,
      url: resource.url,
      purchaseUrl: resource.purchaseUrl,
      accessMode: resource.accessMode as never,
      sortOrder: resource.sortOrder,
    },
    update: {
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType as never,
      url: resource.url,
      purchaseUrl: resource.purchaseUrl,
      accessMode: resource.accessMode as never,
      sortOrder: resource.sortOrder,
      deletedAt: null,
    },
  });
}

async function upsertAccessPlan(
  tx: Tx,
  courseId: string,
  plan: CourseSnapshotAccessPlan,
) {
  await tx.accessPlan.upsert({
    where: { id: plan.id },
    create: {
      id: plan.id,
      courseId,
      name: plan.name,
      description: plan.description,
      planType: plan.planType as never,
      priceCents: plan.priceCents,
      currency: plan.currency,
      billingInterval: plan.billingInterval as never,
      accessDurationDays: plan.accessDurationDays,
      stripePriceId: plan.stripePriceId,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    },
    update: {
      name: plan.name,
      description: plan.description,
      planType: plan.planType as never,
      priceCents: plan.priceCents,
      currency: plan.currency,
      billingInterval: plan.billingInterval as never,
      accessDurationDays: plan.accessDurationDays,
      stripePriceId: plan.stripePriceId,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      deletedAt: null,
    },
  });
}

export function buildSnapshotFromCourse(course: {
  title: string;
  subtitle: string | null;
  description: string;
  thumbnailUrl: string | null;
  trailerYoutubeId: string | null;
  previewMaterialsDescription: string | null;
  estimatedHours: unknown;
  difficultyLevel: string;
  language: string;
  offersCertificate: boolean;
  modules: CourseSnapshotModule[];
  accessPlans: CourseSnapshotAccessPlan[];
}): CourseSnapshotData {
  return {
    course: {
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      trailerYoutubeId: course.trailerYoutubeId,
      previewMaterialsDescription: course.previewMaterialsDescription,
      estimatedHours:
        course.estimatedHours != null ? Number(course.estimatedHours) : null,
      difficultyLevel: course.difficultyLevel,
      language: course.language,
      offersCertificate: course.offersCertificate,
    },
    modules: course.modules,
    accessPlans: course.accessPlans,
  };
}

export function coursePublicUrl(courseId: string): string {
  return `/courses?id=${encodeURIComponent(courseId)}`;
}

export function coursePreviewUrl(courseId: string): string {
  return `/courses?id=${encodeURIComponent(courseId)}&preview=1`;
}

export function courseBuilderUrl(courseId: string): string {
  return `/studio/courses/${encodeURIComponent(courseId)}/builder`;
}

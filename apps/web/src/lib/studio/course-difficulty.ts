export type CourseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export const COURSE_DIFFICULTY_OPTIONS: Array<{
  value: CourseDifficulty;
  apiValue: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}> = [
  { value: 'Beginner', apiValue: 'BEGINNER' },
  { value: 'Intermediate', apiValue: 'INTERMEDIATE' },
  { value: 'Advanced', apiValue: 'ADVANCED' },
];

export function difficultyLabelFromApi(
  value: string | null | undefined,
): CourseDifficulty {
  switch (value) {
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    case 'BEGINNER':
    default:
      return 'Beginner';
  }
}

export function difficultyLabelToApi(
  value: CourseDifficulty,
): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' {
  return (
    COURSE_DIFFICULTY_OPTIONS.find((option) => option.value === value)?.apiValue ?? 'BEGINNER'
  );
}

export function formatCourseDurationHours(hours: number | null | undefined): string {
  if (hours == null || hours <= 0) {
    return 'Duration not set';
  }

  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '');
  return `${rounded}h total`;
}

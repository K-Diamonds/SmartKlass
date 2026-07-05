export type LessonMaterialAccess = 'INCLUDED' | 'PURCHASE' | 'VIDEO';

export const MATERIAL_ACCESS_OPTIONS: Array<{
  id: LessonMaterialAccess;
  label: string;
  description: string;
}> = [
  {
    id: 'INCLUDED',
    label: 'Included with subscription',
    description: 'Learners with access can open this link or file.',
  },
  {
    id: 'PURCHASE',
    label: 'Purchase separately',
    description: 'Add a buy link for materials learners need to purchase on their own.',
  },
  {
    id: 'VIDEO',
    label: 'Video',
    description: 'Link to a video resource included with subscription.',
  },
];

export function getMaterialAccessLabel(accessMode: string): string {
  return (
    MATERIAL_ACCESS_OPTIONS.find((option) => option.id === accessMode)?.label ??
    'Included with subscription'
  );
}

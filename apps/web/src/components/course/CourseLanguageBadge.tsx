'use client';

import { useTranslation } from 'react-i18next';

type CourseLanguageBadgeProps = {
  language: string;
  className?: string;
};

export function CourseLanguageBadge({ language, className }: CourseLanguageBadgeProps) {
  const { t } = useTranslation();
  const label = t(`languages.${language}`, { defaultValue: language.toUpperCase() });

  return (
    <span
      className={className}
      title={label}
    >
      {label}
    </span>
  );
}

export type ResourceProvider = 'GOOGLE_DRIVE' | 'DROPBOX' | 'LINK';

export type ResourceLinkSuggestion = {
  id: ResourceProvider;
  label: string;
  placeholder: string;
  exampleUrl: string;
};

export const RESOURCE_LINK_SUGGESTIONS: ResourceLinkSuggestion[] = [
  {
    id: 'GOOGLE_DRIVE',
    label: 'Google Drive',
    placeholder: 'https://drive.google.com/file/d/.../view?usp=sharing',
    exampleUrl: 'https://drive.google.com/file/d/1abc123/view?usp=sharing',
  },
  {
    id: 'DROPBOX',
    label: 'Dropbox',
    placeholder: 'https://www.dropbox.com/s/.../file.pdf?dl=0',
    exampleUrl: 'https://www.dropbox.com/s/abc123/workbook.pdf?dl=0',
  },
  {
    id: 'LINK',
    label: 'Any link',
    placeholder: 'https://example.com/worksheet.pdf',
    exampleUrl: 'https://example.com/lesson-notes.pdf',
  },
];

export function detectResourceProvider(url: string): ResourceProvider {
  const normalized = url.trim().toLowerCase();

  if (!normalized) {
    return 'LINK';
  }

  if (
    normalized.includes('drive.google.com') ||
    normalized.includes('docs.google.com') ||
    normalized.includes('sheets.google.com') ||
    normalized.includes('slides.google.com')
  ) {
    return 'GOOGLE_DRIVE';
  }

  if (normalized.includes('dropbox.com') || normalized.includes('db.tt')) {
    return 'DROPBOX';
  }

  return 'LINK';
}

export function getResourceSuggestion(provider: ResourceProvider): ResourceLinkSuggestion {
  return (
    RESOURCE_LINK_SUGGESTIONS.find((item) => item.id === provider) ??
    RESOURCE_LINK_SUGGESTIONS[RESOURCE_LINK_SUGGESTIONS.length - 1]
  );
}

export function getResourceProviderLabel(provider: string): string {
  if (provider === 'PDF') return 'PDF';
  if (provider === 'WORKSHEET') return 'Worksheet';
  if (provider === 'CODE') return 'Code';
  if (provider === 'OTHER') return 'File';

  return getResourceSuggestion(provider as ResourceProvider).label;
}

export function toApiResourceType(
  provider: string,
  accessMode?: string,
): 'PDF' | 'LINK' | 'WORKSHEET' | 'CODE' | 'VIDEO' | 'OTHER' {
  if (accessMode === 'VIDEO') {
    return 'VIDEO';
  }

  switch (provider) {
    case 'PDF':
      return 'PDF';
    case 'WORKSHEET':
      return 'WORKSHEET';
    case 'CODE':
      return 'CODE';
    case 'GOOGLE_DRIVE':
    case 'DROPBOX':
    case 'LINK':
    default:
      return 'LINK';
  }
}

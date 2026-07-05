'use client';

import { useMemo, useState } from 'react';
import {
  detectResourceProvider,
  getResourceProviderLabel,
  getResourceSuggestion,
  RESOURCE_LINK_SUGGESTIONS,
  type ResourceProvider,
} from '@/lib/studio/resource-providers';
import {
  getMaterialAccessLabel,
  MATERIAL_ACCESS_OPTIONS,
  type LessonMaterialAccess,
} from '@/lib/studio/material-access';
import { cn } from '@/lib/utils';

export type LessonResourceInput = {
  title: string;
  description: string;
  url: string;
  purchaseUrl: string;
  accessMode: LessonMaterialAccess;
  resourceType: ResourceProvider;
};

type LessonResourceFieldProps = {
  materialsDescription: string;
  onMaterialsDescriptionChange: (value: string) => void;
  resources: Array<{
    id: string;
    title: string;
    description: string;
    resourceType: string;
    url: string;
    purchaseUrl: string;
    accessMode: LessonMaterialAccess;
  }>;
  onAdd: (resource: LessonResourceInput) => void;
  onRemove: (resourceId: string) => void;
  className?: string;
};

export function LessonResourceField({
  materialsDescription,
  onMaterialsDescriptionChange,
  resources,
  onAdd,
  onRemove,
  className,
}: LessonResourceFieldProps) {
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceDescription, setResourceDescription] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [accessMode, setAccessMode] = useState<LessonMaterialAccess>('INCLUDED');
  const [selectedProvider, setSelectedProvider] = useState<ResourceProvider>('LINK');
  const [error, setError] = useState<string | null>(null);

  const activeSuggestion = getResourceSuggestion(selectedProvider);
  const detectedProvider = useMemo(
    () => detectResourceProvider(resourceUrl),
    [resourceUrl],
  );
  const activeAccessOption = MATERIAL_ACCESS_OPTIONS.find((option) => option.id === accessMode);

  const handleProviderSelect = (provider: ResourceProvider) => {
    setSelectedProvider(provider);
    setError(null);
  };

  const handleUrlChange = (value: string) => {
    setResourceUrl(value);
    setError(null);

    if (value.trim()) {
      setSelectedProvider(detectResourceProvider(value));
    }
  };

  const handleAccessModeChange = (mode: LessonMaterialAccess) => {
    setAccessMode(mode);
    setError(null);
  };

  const handleAddResource = () => {
    const title = resourceTitle.trim();
    const description = resourceDescription.trim();
    const url = resourceUrl.trim();
    const buyUrl = purchaseUrl.trim();

    if (!title) {
      setError('Add a material title.');
      return;
    }

    if (accessMode === 'PURCHASE' && !buyUrl) {
      setError('Add a purchase link for materials sold separately.');
      return;
    }

    if (accessMode !== 'PURCHASE' && !url) {
      setError('Add a link for this material.');
      return;
    }

    const linksToValidate = [url, buyUrl].filter(Boolean);

    for (const link of linksToValidate) {
      try {
        new URL(link);
      } catch {
        setError('Enter valid URLs (https://...).');
        return;
      }
    }

    onAdd({
      title,
      description,
      url: url || buyUrl,
      purchaseUrl: buyUrl,
      accessMode,
      resourceType: accessMode === 'VIDEO' ? 'LINK' : detectResourceProvider(url || buyUrl),
    });
    setResourceTitle('');
    setResourceDescription('');
    setResourceUrl('');
    setPurchaseUrl('');
    setAccessMode('INCLUDED');
    setSelectedProvider('LINK');
    setError(null);
  };

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-foreground">Lesson materials</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Describe what learners need for this lesson. Add files, videos, or buy links — mark each as
        included with subscription or purchased separately.
      </p>

      <div className="mt-4">
        <label
          htmlFor="materials-description"
          className="block text-xs font-medium text-muted-foreground"
        >
          Materials overview
        </label>
        <textarea
          id="materials-description"
          rows={3}
          value={materialsDescription}
          onChange={(event) => onMaterialsDescriptionChange(event.target.value)}
          placeholder="e.g. You will need a pasta machine, semolina flour, and the workbook linked below."
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
        />
      </div>

      {resources.length > 0 && (
        <ul className="mt-5 space-y-2">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="rounded-xl border border-border-subtle px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{resource.title}</p>
                    <span className="rounded-full bg-border-subtle px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {getMaterialAccessLabel(resource.accessMode)}
                    </span>
                  </div>
                  {resource.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{resource.description}</p>
                  )}
                  {resource.url && resource.accessMode !== 'PURCHASE' && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{resource.url}</p>
                  )}
                  {resource.purchaseUrl && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Buy: {resource.purchaseUrl}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(resource.id)}
                  className="shrink-0 text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 space-y-4 rounded-xl border border-dashed border-border-subtle p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">How learners get this material</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MATERIAL_ACCESS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleAccessModeChange(option.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  accessMode === option.id
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {activeAccessOption && (
            <p className="mt-2 text-xs text-muted-foreground">{activeAccessOption.description}</p>
          )}
        </div>

        {accessMode !== 'VIDEO' && accessMode !== 'PURCHASE' && (
          <div className="flex flex-wrap gap-2">
            {RESOURCE_LINK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleProviderSelect(suggestion.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedProvider === suggestion.id
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="resource-title" className="block text-xs font-medium text-muted-foreground">
              Material title
            </label>
            <input
              id="resource-title"
              value={resourceTitle}
              onChange={(event) => {
                setResourceTitle(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Lesson workbook"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="resource-description"
              className="block text-xs font-medium text-muted-foreground"
            >
              Material description
            </label>
            <textarea
              id="resource-description"
              rows={2}
              value={resourceDescription}
              onChange={(event) => {
                setResourceDescription(event.target.value);
                setError(null);
              }}
              placeholder="What is this material and how will learners use it?"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          {accessMode !== 'PURCHASE' && (
            <div>
              <label htmlFor="resource-url" className="block text-xs font-medium text-muted-foreground">
                {accessMode === 'VIDEO' ? 'Video link' : 'Resource link'}
              </label>
              <input
                id="resource-url"
                type="url"
                value={resourceUrl}
                onChange={(event) => handleUrlChange(event.target.value)}
                placeholder={
                  accessMode === 'VIDEO'
                    ? 'https://www.youtube.com/watch?v=...'
                    : activeSuggestion.placeholder
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
              />
              {resourceUrl.trim() && accessMode !== 'VIDEO' && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Detected: {getResourceProviderLabel(detectedProvider)}
                </p>
              )}
            </div>
          )}
          {(accessMode === 'PURCHASE' || accessMode === 'INCLUDED') && (
            <div className={accessMode === 'PURCHASE' ? 'sm:col-span-2' : undefined}>
              <label htmlFor="purchase-url" className="block text-xs font-medium text-muted-foreground">
                {accessMode === 'PURCHASE' ? 'Purchase link' : 'Purchase link (optional)'}
              </label>
              <input
                id="purchase-url"
                type="url"
                value={purchaseUrl}
                onChange={(event) => {
                  setPurchaseUrl(event.target.value);
                  setError(null);
                }}
                placeholder="https://shop.example.com/workbook"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAddResource}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border-subtle"
        >
          + Add material
        </button>
      </div>
    </div>
  );
}

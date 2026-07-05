'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, User } from 'lucide-react';
import { uploadAvatar, updateMe } from '@/lib/api/users';
import { ApiRequestError } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type ProfileAvatarFieldProps = {
  displayName: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string | null) => void;
  onError: (message: string | null) => void;
  disabled?: boolean;
};

export function ProfileAvatarField({
  displayName,
  avatarUrl,
  onAvatarChange,
  onError,
  disabled = false,
}: ProfileAvatarFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsUploading(true);
    onError(null);

    try {
      const updated = await uploadAvatar(file);
      onAvatarChange(updated.avatarUrl);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : t('settings.profile.photoUploadError');
      onError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    onError(null);

    try {
      const updated = await updateMe({ avatarUrl: null });
      onAvatarChange(updated.avatarUrl);
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : t('settings.profile.photoRemoveError');
      onError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const isBusy = isUploading || isRemoving || disabled;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            fill
            unoptimized
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent-muted text-accent">
            {initials ? (
              <span className="text-xl font-semibold">{initials}</span>
            ) : (
              <User size={32} />
            )}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark/45 text-xs font-medium text-white">
            …
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {t('settings.profile.photo')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('settings.profile.photoHelp')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle disabled:opacity-60',
            )}
          >
            <Camera size={14} />
            {isUploading ? t('settings.profile.photoUploading') : t('settings.profile.photoUpload')}
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleRemove}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-border-subtle hover:text-foreground disabled:opacity-60"
            >
              {isRemoving ? '…' : t('settings.profile.photoRemove')}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

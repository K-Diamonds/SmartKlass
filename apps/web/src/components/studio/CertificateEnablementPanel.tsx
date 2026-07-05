'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { CERTIFICATE_ENABLEMENT_FEE_CENTS } from '@smartklass/shared';
import { formatPrice } from '@/lib/utils';

type CertificateEnablementPanelProps = {
  courseId: string;
  offersCertificate: boolean;
  certificatePaidAt: string | null;
};

export function CertificateEnablementPanel({
  courseId,
  offersCertificate: initialEnabled,
  certificatePaidAt: initialPaidAt,
}: CertificateEnablementPanelProps) {
  const router = useRouter();
  const [offersCertificate] = useState(initialEnabled);
  const [certificatePaidAt] = useState(initialPaidAt);

  const feeLabel = formatPrice(CERTIFICATE_ENABLEMENT_FEE_CENTS);

  const handleEnable = () => {
    router.push(`/studio/payments?courseId=${encodeURIComponent(courseId)}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted">
          <Award size={20} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Completion certificate
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Offer learners a verified certificate when they finish your course. A one-time{' '}
            <span className="font-medium text-foreground">{feeLabel}</span> platform fee applies
            per course.
          </p>
        </div>
      </div>

      {offersCertificate ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent-muted/50 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 size={16} className="shrink-0 text-accent" />
          <span>
            Certificate enabled
            {certificatePaidAt
              ? ` · Paid ${new Date(certificatePaidAt).toLocaleDateString()}`
              : ''}
          </span>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Your course will appear in the Certificates tab on Discover once enabled, and learners
            receive a certificate of completion when they finish — a tangible milestone that helps
            many students feel accomplished and stay motivated through the last lessons.
          </p>
          <button
            type="button"
            onClick={handleEnable}
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Enable for {feeLabel}
          </button>
        </div>
      )}
    </div>
  );
}

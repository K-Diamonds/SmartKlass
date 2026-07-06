type BeforeAfterDiffProps = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function BeforeAfterDiff({ before, after }: BeforeAfterDiffProps) {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  if (keys.size === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-white/8 bg-[#0e0e14] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
          Before
        </p>
        <dl className="mt-3 space-y-2">
          {[...keys].map((key) => (
            <div key={`before-${key}`}>
              <dt className="text-xs text-white/35">{key}</dt>
              <dd className="mt-0.5 font-mono text-xs text-white/70">
                {formatValue(before?.[key])}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/80">
          After
        </p>
        <dl className="mt-3 space-y-2">
          {[...keys].map((key) => {
            const changed = before?.[key] !== after?.[key];
            return (
              <div key={`after-${key}`}>
                <dt className="text-xs text-white/35">{key}</dt>
                <dd
                  className={
                    changed
                      ? 'mt-0.5 font-mono text-xs text-emerald-300'
                      : 'mt-0.5 font-mono text-xs text-white/70'
                  }
                >
                  {formatValue(after?.[key])}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}

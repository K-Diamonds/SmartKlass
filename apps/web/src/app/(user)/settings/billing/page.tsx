import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

const payments = [
  {
    id: 'pay_1',
    description: 'Pasta Basics — Lifetime Access',
    amountCents: 7900,
    date: 'Mar 1, 2026',
    status: 'Succeeded',
  },
  {
    id: 'pay_2',
    description: 'Pasta Basics — Monthly subscription',
    amountCents: 1499,
    date: 'Jul 1, 2026',
    status: 'Succeeded',
  },
];

export default function BillingSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Billing
      </h1>
      <p className="mt-1 text-muted-foreground">
        Payment history and subscription management
      </p>

      <section className="mt-8 rounded-xl border border-border-subtle bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Payment method</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Managed securely through Stripe Checkout. Update your card during your
          next subscription renewal.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Payment history</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-border-subtle/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border-subtle last:border-0">
                  <td className="px-4 py-3 text-foreground">{payment.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.date}</td>
                  <td className="px-4 py-3 text-foreground">
                    {formatPrice(payment.amountCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        View full billing details on the{' '}
        <Link href="/subscriptions" className="text-accent hover:underline">
          subscriptions page
        </Link>
        .
      </p>
    </div>
  );
}

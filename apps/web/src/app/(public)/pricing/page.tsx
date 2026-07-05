import { redirect } from 'next/navigation';

/** Public pricing page removed — plans are set per creator in Studio. */
export default function PricingPage() {
  redirect('/discover');
}

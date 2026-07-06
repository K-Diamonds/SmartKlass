import type Stripe from 'stripe';

export async function paginateStripeList<T extends { id: string }>(
  fetchPage: (params: {
    starting_after?: string;
    limit: number;
  }) => Promise<Stripe.ApiList<T>>,
  pageSize = 100,
): Promise<T[]> {
  const items: T[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await fetchPage({
      limit: pageSize,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    items.push(...page.data);

    if (!page.has_more || page.data.length === 0) {
      break;
    }

    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) {
      break;
    }
  }

  return items;
}

export async function paginateStripeAuto<T>(
  listFn: (
    params: Stripe.PaginationParams,
  ) => Stripe.ApiListPromise<T> & AsyncIterable<T>,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of listFn({ limit: 100 })) {
    items.push(item);
  }
  return items;
}

'use client';

import { useEffect, useState } from 'react';
import { listCategories } from '@/lib/api/categories';
import { listPublishedCourses } from '@/lib/api/courses';
import { listCreatorDirectory } from '@/lib/api/creators';
import type { CatalogSearchIndex } from '@/lib/catalog/search-index';

const emptyIndex: CatalogSearchIndex = {
  courses: [],
  creators: [],
  categories: [],
};

export function useCatalogSearchIndex(): CatalogSearchIndex {
  const [index, setIndex] = useState<CatalogSearchIndex>(emptyIndex);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [coursesResult, creators, categories] = await Promise.all([
          listPublishedCourses({ limit: 100 }),
          listCreatorDirectory(),
          listCategories(),
        ]);

        if (!cancelled) {
          setIndex({
            courses: coursesResult.items,
            creators,
            categories,
          });
        }
      } catch {
        if (!cancelled) {
          setIndex(emptyIndex);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return index;
}

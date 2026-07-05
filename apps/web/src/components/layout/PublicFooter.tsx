import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { APP_NAME } from '@smartklass/shared';

const columns = [
  {
    title: 'Platform',
    links: [
      { href: '/discover', label: 'Explore Courses' },
      { href: '/studio', label: 'For Creators' },
      { href: '/register', label: 'Get Started' },
    ],
  },
  {
    title: 'Creators',
    links: [
      { href: '/studio', label: 'Creator Studio' },
      { href: '/studio/courses/new', label: 'Course Builder' },
      { href: '/studio/revenue', label: 'Analytics' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/library', label: 'My Library' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-dark">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-16 lg:px-10">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent">
                <BookOpen size={15} className="text-accent-foreground" />
              </div>
              <span className="font-display font-semibold text-white">{APP_NAME}</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
              The next-generation learning marketplace for creators and learners everywhere.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h4
                className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {column.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs transition-colors duration-150 hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

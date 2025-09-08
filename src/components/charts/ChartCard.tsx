import { ReactNode } from 'react';

export default function ChartCard({ title, subtitle, children, footer, 'aria-label': ariaLabel }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; 'aria-label'?: string;
}) {
  return (
    <section
      className="bg-platform-card-background text-platform-text rounded-2xl shadow-lg p-4 md:p-6 flex flex-col border border-platform-contrast h-full"
      role="region"
      aria-label={ariaLabel || title}
    >
      <header className="mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-platform-text">{title}</h2>
        {subtitle && <p className="text-sm text-platform-text/70">{subtitle}</p>}
      </header>
      <div className="flex-1 relative">
        {children}
      </div>
      {footer && <footer className="pt-3 border-t border-platform-contrast mt-4 text-xs text-platform-text/70">{footer}</footer>}
    </section>
  );
}
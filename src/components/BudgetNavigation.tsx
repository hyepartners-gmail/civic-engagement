import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export default function BudgetNavigation() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { href: '/budget', label: 'Budget Overview', key: 'overview' },
    { href: '/budget/explore', label: 'Explore', key: 'explore' }, // New navigation item
    { href: '/budget/you', label: 'Your Impact', key: 'you' },
    { href: '/budget/lab', label: 'Budget Lab', key: 'lab' },
    { href: '/budget/taxes', label: 'Tax Analysis', key: 'taxes' },
  ];

  return (
    <div className="bg-platform-card-background p-4 rounded-lg border border-platform-contrast">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          
          return (
            <Link key={item.key} href={item.href}>
              <Button 
                className={
                  isActive 
                    ? "bg-platform-accent hover:bg-platform-accent/80 text-white border-platform-accent"
                    : "border-platform-accent text-platform-accent hover:bg-platform-accent hover:text-white"
                }
                variant={isActive ? "default" : "outline"}
                size="sm"
              >
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
import { useUi } from '@/contexts/UiContext';
import { Button } from './ui/button';

export default function ModeToggle() {
  const { mode, setMode } = useUi();

  return (
    <div className="flex items-center gap-1 p-1 bg-platform-contrast rounded-lg">
      <Button
        size="sm"
        variant={mode === '%GDP' ? 'platform-primary' : 'ghost'}
        onClick={() => setMode('%GDP')}
        className="flex-1"
      >
        % GDP
      </Button>
      <Button
        size="sm"
        variant={mode === 'nominal' ? 'platform-primary' : 'ghost'}
        onClick={() => setMode('nominal')}
        className="flex-1"
      >
        Nominal
      </Button>
      <Button
        size="sm"
        variant={mode === 'real' ? 'platform-primary' : 'ghost'}
        onClick={() => setMode('real')}
        className="flex-1"
      >
        Real
      </Button>
    </div>
  );
}
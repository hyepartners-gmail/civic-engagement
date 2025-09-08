import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-red-400">
      <AlertTriangle className="h-8 w-8" />
      <p className="mt-4 text-sm text-center">{message}</p>
    </div>
  );
}
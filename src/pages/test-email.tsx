import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestEmailPage() {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sendTestEmail = async () => {
    setIsSending(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'An error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Test Email with Resend</h1>
      <Button onClick={sendTestEmail} disabled={isSending}>
        {isSending ? 'Sending...' : 'Send Test Email'}
      </Button>
      
      {result && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
          <h2 className="font-bold">Success:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
          <h2 className="font-bold">Error:</h2>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
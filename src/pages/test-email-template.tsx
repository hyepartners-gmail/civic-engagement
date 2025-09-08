import { useState } from 'react';
import { renderEmailTemplate, getVerificationEmailTemplate } from '@/lib/email/templates';
import { Button } from '@/components/ui/button';

export default function TestEmailTemplatePage() {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [showHtml, setShowHtml] = useState(false);

  const testTemplateRendering = () => {
    const { subject, html } = getVerificationEmailTemplate();
    const verificationLink = 'https://example.com/verify?token=abc123&userId=123';
    
    const rendered = renderEmailTemplate(html, {
      verificationLink
    });
    
    setRenderedHtml(rendered);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Test Email Template Rendering</h1>
      
      <div className="mb-6">
        <Button onClick={testTemplateRendering} className="mr-2">
          Test Verification Template
        </Button>
        <Button onClick={() => setShowHtml(!showHtml)} variant="outline">
          {showHtml ? 'Hide HTML' : 'Show HTML'}
        </Button>
      </div>
      
      {renderedHtml && (
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Rendered Template:</h2>
          {showHtml ? (
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {renderedHtml}
            </pre>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          )}
        </div>
      )}
    </div>
  );
}
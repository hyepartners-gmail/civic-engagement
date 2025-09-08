import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EmailTemplatesManager: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [testEmail, setTestEmail] = useState('mrfredclay@gmail.com');
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Load templates from datastore on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates');
      const templates = await response.json();
      setTemplates(templates);
      
      // Set the first template as active if available
      if (templates.length > 0) {
        handleTemplateSelect(templates[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Handle the error properly
    }
  };

  const handleTemplateSelect = (template: any) => {
    setActiveTemplate(template);
    setTemplateName(template.name);
    setSubject(template.subject);
    setHtmlContent(template.htmlContent);
    setTemplateId(template.id);
  };

  const handleCreateNewTemplate = () => {
    // Generate a unique name using timestamp for new templates
    const uniqueName = `New_Template_${Date.now()}`;
    
    const newTemplate = {
      id: null,
      name: uniqueName,
      subject: 'New Email Subject',
      htmlContent: '<p>New email content</p>',
    };
    
    setActiveTemplate(newTemplate);
    setTemplateName(newTemplate.name);
    setSubject(newTemplate.subject);
    setHtmlContent(newTemplate.htmlContent);
    setTemplateId(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName) {
      alert('Please enter a template name');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: templateId, // Only include ID if it exists (for existing templates)
          name: templateName,
          subject: subject,
          htmlContent: htmlContent,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        if (result.id) {
          setTemplateId(result.id);
        }
        alert(`Template saved successfully!`);
        // Reload templates to update the list
        loadTemplates();
      } else {
        alert(`Failed to save template: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert(`Error saving template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      const response = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          from: 'hyepartners@gmail.com',
          subject: subject,
          html: htmlContent,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Test email sent successfully to ${testEmail}!`);
      } else {
        alert(`Failed to send test email: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert(`Error sending test email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-thin text-platform-text mb-4">Email Templates</h2>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {templates.map((template) => (
          <Button 
            key={template.id || template.name} // Use ID if available, otherwise name
            variant={activeTemplate?.id === template.id ? 'platform-primary' : 'platform-secondary'}
            onClick={() => handleTemplateSelect(template)}
            className="mr-2 mb-2"
          >
            {template.name}
          </Button>
        ))}
        <Button 
          variant="platform-secondary"
          onClick={handleCreateNewTemplate}
          className="mr-2 mb-2"
        >
          +
        </Button>
      </div>

      {activeTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Email Template Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <Input 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <Input 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">HTML Content</label>
              <Textarea 
                value={htmlContent} 
                onChange={(e) => setHtmlContent(e.target.value)}
                className="w-full h-64 font-mono text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Test Email Address</label>
              <Input 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full"
                type="email"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleSaveTemplate} variant="platform-primary">
                Save Template
              </Button>
              <Button onClick={handleSendTestEmail} variant="platform-secondary">
                Send Test Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Template Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-platform-text/80 mb-2">Available variables for email templates:</p>
          <ul className="text-sm space-y-1">
            <li><code className="bg-platform-contrast px-1 rounded">&#123;&#123;userName&#125;&#125;</code> - User's display name</li>
            <li><code className="bg-platform-contrast px-1 rounded">&#123;&#123;verificationLink&#125;&#125;</code> - Email verification link</li>
            <li><code className="bg-platform-contrast px-1 rounded">&#123;&#123;homepageLink&#125;&#125;</code> - Link to Amendments homepage</li>
            <li><code className="bg-platform-contrast px-1 rounded">&#123;&#123;notificationContent&#125;&#125;</code> - Notification content</li>
            <li><code className="bg-platform-contrast px-1 rounded">&#123;&#123;notificationLink&#125;&#125;</code> - Link to notification</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplatesManager;
// A thin wrapper for the /api/send-email endpoint.

interface EmailPayload {
  to: string;
  subject: string;
  body: string; // HTML body
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, message: 'Email sent successfully.' };
    } else {
      const data = await response.json();
      return { success: false, message: data.message || 'Failed to send email.' };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Send } from 'lucide-react';

// Real QR Code component using qrcode library
function QRCodeImage({ value }: { value: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (value && typeof window !== 'undefined') {
      // Dynamically import qrcode library only on client side
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(value, {
          width: 128,
          margin: 1,
          color: {
            dark: '#12001a',
            light: '#ffffff'
          }
        }).then((url) => {
          setQrDataUrl(url);
        }).catch((err) => {
          console.error('QR Code generation failed:', err);
        });
      });
    }
  }, [value]);

  if (!mounted || !qrDataUrl) {
    return (
      <div className="w-32 h-32 bg-platform-contrast rounded-lg flex items-center justify-center">
        <span className="text-xs text-platform-text/50">Loading QR...</span>
      </div>
    );
  }

  return (
    <div className="p-2 bg-white rounded-lg">
      <img src={qrDataUrl} alt="QR Code" className="w-28 h-28" />
    </div>
  );
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupCode: string;
  groupId: string;
}

export default function InviteModal({ isOpen, onClose, groupCode, groupId }: InviteModalProps) {
  const [emails, setEmails] = useState(['']);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const [inviteUrl, setInviteUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInviteUrl(`${window.location.origin}/common-ground/group/${groupId}?joinCode=${groupCode}`);
    }
  }, [groupId, groupCode]);

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleAddEmail = () => {
    setEmails([...emails, '']);
  };

  const handleSendInvites = async () => {
    const validEmails = emails.filter(email => email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (validEmails.length === 0) {
      toast({ title: 'No Valid Emails', description: 'Please enter at least one valid email address.' });
      return;
    }
    setIsSending(true);
    try {
      for (const email of validEmails) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `You're invited to a Common Ground group!`,
            body: `You've been invited to join a Common Ground group. Click the link to accept: <a href="${inviteUrl}">${inviteUrl}</a>`
          }),
        });
      }
      toast({ title: 'Invites Sent!', description: `Invites have been sent to ${validEmails.length} address(es).` });
      setEmails(['']);
      onClose();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send invites. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: 'Link Copied!', description: 'Invite link copied to clipboard.' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-platform-background text-platform-text border-platform-contrast">
        <DialogHeader>
          <DialogTitle className="text-platform-text">Invite Members</DialogTitle>
          <DialogDescription>
            Share this code or link with others to have them join your group.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-platform-text/70">Join with this code:</p>
          <div className="text-4xl font-mono tracking-widest bg-platform-contrast px-4 py-2 rounded-lg">
            {groupCode}
          </div>
          <QRCodeImage value={inviteUrl} />
          <div className="w-full">
            <p className="text-sm text-platform-text/70 mb-2">Or share this link:</p>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} className="bg-platform-contrast" />
              <Button onClick={handleCopyLink} size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="w-full border-t border-platform-contrast pt-4 mt-4">
            <p className="text-sm text-platform-text/70 mb-2">Or send email invites:</p>
            <div className="space-y-2">
              {emails.map((email, index) => (
                <Input
                  key={index}
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  className="bg-platform-contrast"
                />
              ))}
            </div>
            <Button variant="link" onClick={handleAddEmail} className="text-platform-accent text-xs mt-2">
              + Add another
            </Button>
            <Button onClick={handleSendInvites} disabled={isSending} className="w-full mt-4">
              <Send className="mr-2 h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Invites'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
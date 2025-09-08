import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/MainLayout';

export default function InvitePage() {
  const router = useRouter();
  const { inviteCode } = router.query;
  const { status } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    if (status === 'loading' || !inviteCode) return;

    if (status === 'unauthenticated') {
      // Store invite code and redirect to auth
      localStorage.setItem('pendingInviteCode', inviteCode as string);
      router.push('/auth');
    } else if (status === 'authenticated') {
      // User is logged in, try to join the group
      const joinGroup = async () => {
        try {
          // In a real app, you'd have an endpoint to resolve invite code to group ID
          const groupId = "placeholder-group-id"; // Placeholder
          
          const res = await fetch(`/api/common-ground/groups/${groupId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupCode: inviteCode }), // Assuming invite code can be used as join code
          });

          if (res.ok) {
            toast({ title: 'Success!', description: 'You have joined the group.' });
            router.push(`/common-ground/group/${groupId}`);
          } else {
            const data = await res.json();
            throw new Error(data.message);
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message });
          router.push('/common-ground');
        }
      };
      joinGroup();
    }
  }, [status, inviteCode, router, toast]);

  return (
    <MainLayout>
      <div className="text-center p-8">
        <p>Processing your invite...</p>
      </div>
    </MainLayout>
  );
}
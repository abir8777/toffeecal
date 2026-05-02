import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function DeleteAccountDialog() {
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Explicitly attach the user's access token so the edge function can
      // identify the user (verify_jwt = false means it isn't auto-attached).
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('You are not signed in. Please sign in again.');
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirmText: 'DELETE' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await signOut();
      toast.success('Your account has been deleted');
    } catch (error) {
      console.error('Delete account failed:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to delete account. Please try again.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
        >
          <Trash2 className="h-5 w-5" />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action cannot be undone. This will permanently delete your account
              and remove all your data including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Your profile information</li>
              <li>All food logs and history</li>
              <li>Weight tracking data</li>
              <li>Water intake records</li>
              <li>Your profile picture</li>
            </ul>
            <p className="font-medium pt-2">
              Type <span className="text-destructive">DELETE</span> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mt-2"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

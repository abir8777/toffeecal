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
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    if (!user || confirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      // Delete user data from tables
      await supabase.from('food_logs').delete().eq('user_id', user.id);
      await supabase.from('weight_logs').delete().eq('user_id', user.id);
      await supabase.from('water_intake').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);

      // Delete avatar from storage
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (files && files.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(files.map(f => `${user.id}/${f.name}`));
      }

      // Sign out the user
      await signOut();
      
      toast.success('Your account data has been deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete account data');
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

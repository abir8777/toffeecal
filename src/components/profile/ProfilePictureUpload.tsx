import { useState, useRef } from 'react';
import { User, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProfilePictureUploadProps {
  currentAvatarUrl: string | null | undefined;
  onUploadSuccess: (url: string) => void;
  userName?: string | null;
}

export function ProfilePictureUpload({ 
  currentAvatarUrl, 
  onUploadSuccess,
  userName 
}: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is private)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('avatars')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      if (signedUrlError || !signedUrlData?.signedUrl) throw signedUrlError || new Error('Failed to get URL');

      const urlWithCacheBuster = `${signedUrlData.signedUrl}&t=${Date.now()}`;

      onUploadSuccess(urlWithCacheBuster);
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      <div 
        className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center overflow-hidden cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        {currentAvatarUrl ? (
          <img 
            src={currentAvatarUrl} 
            alt={userName || 'Profile'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="h-8 w-8 text-primary-foreground" />
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

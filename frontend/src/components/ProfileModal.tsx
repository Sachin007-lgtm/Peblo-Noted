import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface ProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileModal({ user, isOpen, onClose, onLogout }: ProfileModalProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We use Canvas to resize and compress the image into a tiny WebP so it fits in user_metadata
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          setAvatarUrl(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar: avatarUrl }
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-xl font-bold text-text-primary mb-6">Account Profile</h2>

        <div className="flex flex-col items-center mb-6">
          <div className="relative group mb-4">
            <div className="w-24 h-24 rounded-full bg-accent text-white flex items-center justify-center overflow-hidden shadow-lg border-4 border-surface">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            
            {/* Hover overlay to change picture */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <span className="material-symbols-outlined text-white">photo_camera</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          <h3 className="text-lg font-semibold text-text-primary">{user.name}</h3>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>

        {error && <p className="text-xs text-red-500 mb-4 text-center">{error}</p>}

        <div className="flex flex-col gap-2">
          <button 
            onClick={handleSave}
            disabled={loading || avatarUrl === user.avatar}
            className="w-full bg-accent hover:bg-accent-dark text-white rounded-xl py-2.5 font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Profile Picture'}
          </button>
          
          <button 
            onClick={() => { onClose(); onLogout(); }}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 rounded-xl py-2.5 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

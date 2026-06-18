import { useState, useEffect } from 'react';
import { User, Camera, Mail, Shield, Loader2, Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      setFormData({
        name: response.data.name || '',
        bio: response.data.bio || '',
      });
      // Keep sidebar user info in sync
      localStorage.setItem('smart_attendance_user', JSON.stringify(response.data));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load profile');
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.put('/auth/me', formData);
      setUser(data);
      localStorage.setItem('smart_attendance_user', JSON.stringify(data));
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.put('/auth/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUser(prev => ({ ...prev, avatar_url: response.data.avatar_url }));
      toast.success('Avatar updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload avatar');
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Avatar & Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-transform hover:scale-110"
              >
                <Camera className="w-5 h-5" />
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                accept="image/jpeg, image/png" 
                className="hidden" 
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="mt-6 text-center">
              <h3 className="text-xl font-bold">{user?.name || 'User Name'}</h3>
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                <Shield className="w-3 h-3 mr-1" />
                {user?.role || 'Role'}
              </div>
            </div>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-4 h-4 mr-2" />
                {user?.email || 'email@example.com'}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-medium mb-6">Profile Details</h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-foreground">
                  Bio (for Course Listings)
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  className="mt-1 block w-full bg-background border border-border rounded-lg py-2.5 px-3 text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-colors sm:text-sm"
                  placeholder="Tell students a bit about yourself..."
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Brief description for your profile.
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

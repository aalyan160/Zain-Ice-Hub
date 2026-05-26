import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Save, UserCircle, KeyRound, Image as ImageIcon } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', pin: '', avatar_url: '' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionUser = JSON.parse(localStorage.getItem('zain_ice_user') || '{}');
    setUser(sessionUser);
    setFormData({
      name: sessionUser.name || '',
      pin: sessionUser.pin || '',
      avatar_url: sessionUser.avatar_url || ''
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (formData.pin.length < 4) {
      setMessage('Error: PIN must be at least 4 digits long.');
      setLoading(false);
      return;
    }

    try {
      if (user.id) {
        // Attempt to update Supabase
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            pin: formData.pin,
            avatar_url: formData.avatar_url
          })
          .eq('id', user.id);

        if (error) {
          console.error('Supabase Update Error:', error);
          if (error.message && error.message.includes('avatar_url')) {
            setMessage('Error: The avatar_url column is missing in your database. Please run the SQL command provided!');
          } else {
            setMessage(`Database Error: ${error.message}`);
          }
          setLoading(false);
          return;
        }
      }

      // Update local storage
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('zain_ice_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage('Profile updated successfully!');
      
      // Dispatch a custom event so the Dashboard header can update immediately
      window.dispatchEvent(new Event('profileUpdated'));

    } catch (err) {
      console.error(err);
      setMessage('An unexpected error occurred.');
    }
    setLoading(false);
  };

  const handleFileUpload = async (event) => {
    try {
      setUploading(true);
      setMessage('');
      
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setFormData({ ...formData, avatar_url: data.publicUrl });
      setMessage('Image uploaded successfully! Click Save Changes to apply.');
    } catch (error) {
      console.error('Upload Error:', error);
      setMessage(`Upload failed: ${error.message}. Make sure you created the 'avatars' storage bucket!`);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      style={{ maxWidth: '600px', margin: '0 auto' }}
    >
      <div className="glass-card">
        <h2 className="mb-4">Admin Profile</h2>

        <div className="flex justify-center mb-4">
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid white', boxShadow: 'var(--card-shadow)', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <UserCircle size={64} className="text-primary" />
            )}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="text-muted flex items-center gap-2 mb-1" style={{ fontSize: '0.9rem' }}>
              <UserCircle size={16} /> Display Name
            </label>
            <input 
              required
              className="input-field" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Zain"
            />
          </div>

          <div className="mb-3">
            <label className="text-muted flex items-center gap-2 mb-1" style={{ fontSize: '0.9rem' }}>
              <KeyRound size={16} /> Secret PIN
            </label>
            <input 
              required
              className="input-field" 
              value={formData.pin}
              onChange={(e) => setFormData({...formData, pin: e.target.value})}
              placeholder="4-digit PIN"
              maxLength={8}
            />
            <small className="text-muted mt-1" style={{ display: 'block' }}>Used to log into the dashboard.</small>
          </div>

          <div className="mb-4">
            <label className="text-muted flex items-center gap-2 mb-1" style={{ fontSize: '0.9rem' }}>
              <ImageIcon size={16} /> Profile Picture
            </label>
            <div className="flex gap-2">
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <label 
                htmlFor="avatar-upload" 
                className="btn btn-outline" 
                style={{ flex: 1, textAlign: 'center', cursor: 'pointer', padding: '0.75rem' }}
              >
                {uploading ? 'Uploading...' : 'Choose from Computer'}
              </label>
            </div>
            <div className="mt-2 text-center text-muted" style={{ fontSize: '0.8rem' }}>OR</div>
            <input 
              className="input-field mt-2" 
              value={formData.avatar_url}
              onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
              placeholder="Paste image URL here"
            />
          </div>

          {message && (
            <div className={`mb-3 p-3 text-center ${message.includes('Error') ? 'text-danger' : 'text-success'}`} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '8px', fontWeight: '500' }}>
              {message}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

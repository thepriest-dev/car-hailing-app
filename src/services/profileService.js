import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

export const uploadProfileImage = async (uri, setUploading, setProfileImage) => {
  setUploading(true);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }
    
    // Convert image to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create unique filename
    const fileExt = uri.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profileImage: publicUrl })
      .eq('id', user.id);
    
    if (updateError) throw updateError;
    
    // Update local state
    setProfileImage(publicUrl);
    Alert.alert('Success', 'Profile picture updated!');
    
  } catch (error) {
    console.log('Upload error:', error);
    Alert.alert('Upload Failed', error.message);
  } finally {
    setUploading(false);
  }
};
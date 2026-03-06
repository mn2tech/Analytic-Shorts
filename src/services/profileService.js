import { supabase } from '../lib/supabase'
import apiClient from '../config/api'

// Search users by name (for messaging - start new conversation)
export async function searchUsers(query) {
  const q = (query || '').trim()
  if (q.length < 2) return []
  try {
    const { data } = await apiClient.get('/api/profiles/search', { params: { q } })
    return data?.users ?? []
  } catch (err) {
    console.error('searchUsers:', err)
    return []
  }
}

// Get user profile from shorts_user_profiles table
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('shorts_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If profile doesn't exist, return null (it will be created by trigger)
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    throw error
  }
}

// Create or update user profile (name, avatar_url, company, role for LinkedIn-style feed)
export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('shorts_user_profiles')
      .upsert({
        id: userId,
        user_id: userId,
        name: profileData.name ?? undefined,
        avatar_url: profileData.avatar_url !== undefined ? profileData.avatar_url : undefined,
        company: profileData.company,
        role: profileData.role,
        preferences: profileData.preferences || {},
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Update user preferences only
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const { data, error } = await supabase
      .from('shorts_user_profiles')
      .update({ preferences })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating user preferences:', error)
    throw error
  }
}





import { supabase } from '../lib/supabase'

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

// Create or update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('shorts_user_profiles')
      .upsert({
        id: userId,
        user_id: userId,
        name: profileData.name,
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



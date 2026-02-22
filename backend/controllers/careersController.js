const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

// ---- Jobs (admin only to create/update/delete) ----

async function getJobs(req, res) {
  try {
    const db = getAdmin()
    const { data, error } = await db
      .from('job_postings')
      .select('id, title, company_name, description, location, employment_type, apply_url, posted_by, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    const ids = [...new Set((data || []).map((j) => j.posted_by).filter(Boolean))]
    let names = {}
    if (ids.length > 0) {
      const { data: profiles } = await db
        .from('shorts_user_profiles')
        .select('user_id, name')
        .in('user_id', ids)
      ;(profiles || []).forEach((p) => { names[p.user_id] = p.name || null })
    }
    const list = (data || []).map((j) => ({
      ...j,
      posted_by_name: names[j.posted_by] || null
    }))
    res.json({ jobs: list })
  } catch (err) {
    console.error('getJobs:', err)
    res.status(500).json({ error: err.message || 'Failed to load jobs' })
  }
}

async function createJob(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { title, company_name, description, location, employment_type, apply_url } = req.body
    if (!title || !company_name || !description) {
      return res.status(400).json({ error: 'title, company_name, and description are required' })
    }
    const db = getAdmin()
    const { data, error } = await db
      .from('job_postings')
      .insert({
        title: String(title).trim().slice(0, 500),
        company_name: String(company_name).trim().slice(0, 300),
        description: String(description).trim().slice(0, 10000),
        location: location != null ? String(location).trim().slice(0, 200) : null,
        employment_type: ['full-time', 'part-time', 'contract', 'internship', 'other'].includes(employment_type) ? employment_type : null,
        apply_url: apply_url ? String(apply_url).trim().slice(0, 2000) : null,
        posted_by: userId
      })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('createJob:', err)
    res.status(500).json({ error: err.message || 'Failed to create job' })
  }
}

async function updateJob(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { id } = req.params
    const { title, company_name, description, location, employment_type, apply_url } = req.body
    const db = getAdmin()
    const updates = {}
    if (title !== undefined) updates.title = String(title).trim().slice(0, 500)
    if (company_name !== undefined) updates.company_name = String(company_name).trim().slice(0, 300)
    if (description !== undefined) updates.description = String(description).trim().slice(0, 10000)
    if (location !== undefined) updates.location = location == null ? null : String(location).trim().slice(0, 200)
    if (employment_type !== undefined) updates.employment_type = ['full-time', 'part-time', 'contract', 'internship', 'other'].includes(employment_type) ? employment_type : null
    if (apply_url !== undefined) updates.apply_url = apply_url ? String(apply_url).trim().slice(0, 2000) : null
    if (Object.keys(updates).length === 0) {
      const { data: existing } = await db.from('job_postings').select('*').eq('id', id).single()
      return res.json(existing)
    }
    const { data, error } = await db
      .from('job_postings')
      .update(updates)
      .eq('id', id)
      .eq('posted_by', userId)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Job not found or you cannot edit it' })
    res.json(data)
  } catch (err) {
    console.error('updateJob:', err)
    res.status(500).json({ error: err.message || 'Failed to update job' })
  }
}

async function deleteJob(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { id } = req.params
    const db = getAdmin()
    const { data, error } = await db
      .from('job_postings')
      .delete()
      .eq('id', id)
      .eq('posted_by', userId)
      .select('id')
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Job not found or you cannot delete it' })
    res.json({ deleted: true, id: data.id })
  } catch (err) {
    console.error('deleteJob:', err)
    res.status(500).json({ error: err.message || 'Failed to delete job' })
  }
}

// ---- Resumes (any authenticated user can create/update/delete own) ----

async function getResumes(req, res) {
  try {
    const db = getAdmin()
    const { data: resumes, error } = await db
      .from('user_resumes')
      .select('id, user_id, headline, summary, resume_url, created_at, updated_at')
      .order('updated_at', { ascending: false })
    if (error) throw error
    const userIds = [...new Set((resumes || []).map((r) => r.user_id).filter(Boolean))]
    let names = {}
    let avatars = {}
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('shorts_user_profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds)
      ;(profiles || []).forEach((p) => {
        names[p.user_id] = p.name || null
        avatars[p.user_id] = p.avatar_url || null
      })
    }
    const list = (resumes || []).map((r) => ({
      ...r,
      display_name: names[r.user_id] || `User ${String(r.user_id).slice(0, 8)}…`,
      avatar_url: avatars[r.user_id] || null
    }))
    res.json({ resumes: list })
  } catch (err) {
    console.error('getResumes:', err)
    res.status(500).json({ error: err.message || 'Failed to load resumes' })
  }
}

async function createResume(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { headline, summary, resume_url } = req.body
    if (!headline || !summary || !resume_url) {
      return res.status(400).json({ error: 'headline, summary, and resume_url are required' })
    }
    const db = getAdmin()
    const { data, error } = await db
      .from('user_resumes')
      .upsert(
        {
          user_id: userId,
          headline: String(headline).trim().slice(0, 300),
          summary: String(summary).trim().slice(0, 5000),
          resume_url: String(resume_url).trim().slice(0, 2000),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('createResume:', err)
    res.status(500).json({ error: err.message || 'Failed to save resume' })
  }
}

async function updateResume(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { id } = req.params
    const { headline, summary, resume_url } = req.body
    const db = getAdmin()
    const updates = { updated_at: new Date().toISOString() }
    if (headline !== undefined) updates.headline = String(headline).trim().slice(0, 300)
    if (summary !== undefined) updates.summary = String(summary).trim().slice(0, 5000)
    if (resume_url !== undefined) updates.resume_url = String(resume_url).trim().slice(0, 2000)
    const { data, error } = await db
      .from('user_resumes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Resume not found or you cannot edit it' })
    res.json(data)
  } catch (err) {
    console.error('updateResume:', err)
    res.status(500).json({ error: err.message || 'Failed to update resume' })
  }
}

async function deleteResume(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { id } = req.params
    const db = getAdmin()
    const { data, error } = await db
      .from('user_resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Resume not found or you cannot delete it' })
    res.json({ deleted: true, id: data.id })
  } catch (err) {
    console.error('deleteResume:', err)
    res.status(500).json({ error: err.message || 'Failed to delete resume' })
  }
}

async function getMyResume(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const db = getAdmin()
    const { data, error } = await db
      .from('user_resumes')
      .select('id, user_id, headline, summary, resume_url, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    res.json(data || null)
  } catch (err) {
    console.error('getMyResume:', err)
    res.status(500).json({ error: err.message || 'Failed to load resume' })
  }
}

module.exports = {
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  getResumes,
  getMyResume,
  createResume,
  updateResume,
  deleteResume
}

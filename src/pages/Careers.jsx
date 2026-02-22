import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loader from '../components/Loader'
import {
  getJobs,
  createJob,
  deleteJob,
  getResumes,
  getMyResume,
  createResume,
  updateResume,
  deleteResume,
  uploadResumeFile
} from '../services/careersService'
import apiClient from '../config/api'

const EMPLOYMENT_LABELS = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  other: 'Other'
}

function getInitials(name) {
  if (!name || !String(name).trim()) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return String(name).slice(0, 2).toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Careers() {
  const { user, userProfile } = useAuth()
  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [myResume, setMyResume] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sidebar forms
  const [jobForm, setJobForm] = useState({ title: '', company_name: '', description: '', location: '', employment_type: '', apply_url: '' })
  const [jobSending, setJobSending] = useState(false)
  const [jobError, setJobError] = useState(null)
  const [resumeForm, setResumeForm] = useState({ headline: '', summary: '', resume_url: '' })
  const [resumeSending, setResumeSending] = useState(false)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeError, setResumeError] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [showJobForm, setShowJobForm] = useState(false)
  const [showResumeForm, setShowResumeForm] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [jobsList, resumesList] = await Promise.all([getJobs(), getResumes()])
      setJobs(Array.isArray(jobsList) ? jobsList : [])
      setResumes(Array.isArray(resumesList) ? resumesList : [])
      if (user) {
        const adminRes = await apiClient.get('/api/analytics/admin-check').then((r) => r.data?.isAdmin).catch(() => false)
        setIsAdmin(!!adminRes)
        const myRes = await getMyResume().catch(() => null)
        setMyResume(myRes || null)
        if (myRes) {
          setResumeForm({ headline: myRes.headline || '', summary: myRes.summary || '', resume_url: myRes.resume_url || '' })
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load careers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const handlePostJob = async (e) => {
    e.preventDefault()
    setJobSending(true)
    setJobError(null)
    try {
      const created = await createJob({
        title: jobForm.title.trim(),
        company_name: jobForm.company_name.trim(),
        description: jobForm.description.trim(),
        location: jobForm.location.trim() || undefined,
        employment_type: jobForm.employment_type || undefined,
        apply_url: jobForm.apply_url.trim() || undefined
      })
      setJobs((prev) => [created, ...prev])
      setJobForm({ title: '', company_name: '', description: '', location: '', employment_type: '', apply_url: '' })
      setShowJobForm(false)
    } catch (err) {
      setJobError(err.response?.data?.error || err.message || 'Failed to post job')
    } finally {
      setJobSending(false)
    }
  }

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Remove this job posting?')) return
    try {
      await deleteJob(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch (err) {
      setJobError(err.response?.data?.error || err.message)
    }
  }

  const handleResumeFileChange = (e) => {
    const file = e.target.files?.[0]
    setResumeFile(file || null)
  }

  const handleSubmitResume = async (e) => {
    e.preventDefault()
    if (!user) return
    setResumeSending(true)
    setResumeError(null)
    try {
      let url = resumeForm.resume_url.trim()
      if (resumeFile) {
        setResumeUploading(true)
        const uploadedUrl = await uploadResumeFile(resumeFile)
        if (uploadedUrl) url = uploadedUrl.startsWith('http') ? uploadedUrl : `${window.location.origin}${uploadedUrl}`
        setResumeUploading(false)
      }
      if (!url) {
        setResumeError('Provide a resume link or upload a file.')
        setResumeSending(false)
        return
      }
      await createResume({ headline: resumeForm.headline.trim(), summary: resumeForm.summary.trim(), resume_url: url })
      const [updatedList, my] = await Promise.all([getResumes(), getMyResume()])
      setResumes(updatedList)
      setMyResume(my || null)
      setResumeForm({ headline: '', summary: '', resume_url: '' })
      setResumeFile(null)
      setShowResumeForm(false)
    } catch (err) {
      setResumeError(err.response?.data?.error || err.message || 'Failed to save resume')
    } finally {
      setResumeSending(false)
    }
  }

  const handleDeleteResume = async () => {
    if (!myResume || !window.confirm('Remove your resume from the list?')) return
    try {
      await deleteResume(myResume.id)
      setMyResume(null)
      setResumes((prev) => prev.filter((r) => r.user_id !== user.id))
      setResumeForm({ headline: '', summary: '', resume_url: '' })
    } catch (err) {
      setResumeError(err.response?.data?.error || err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100/80">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main: Jobs + Resumes (job-post style cards) */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Careers</h1>
              <p className="text-sm text-gray-500 mt-1">Job postings and community resumes — find opportunities or share your profile.</p>
            </div>
            {loading && <Loader />}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-4">
                {error}
              </div>
            )}
            {!loading && (
              <>
                <section className="mb-10">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-emerald-600">Job postings</span>
                  </h2>
                  {jobs.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                      <p>No job postings yet.</p>
                      {isAdmin && <p className="mt-1 text-sm">Use the side panel to post a job.</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job) => (
                        <article
                          key={job.id}
                          className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                        >
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
                                <p className="text-sm text-gray-600 mt-0.5">{job.company_name}</p>
                              </div>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            {(job.location || job.employment_type) && (
                              <p className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                                {job.location && <span>{job.location}</span>}
                                {job.employment_type && <span>{EMPLOYMENT_LABELS[job.employment_type] || job.employment_type}</span>}
                              </p>
                            )}
                            <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              {job.apply_url && (
                                <a
                                  href={job.apply_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                                >
                                  Apply
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                              <span className="text-xs text-gray-400">{formatDate(job.created_at)}</span>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-600">Community resumes</span>
                  </h2>
                  {resumes.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                      <p>No resumes yet.</p>
                      {user && <p className="mt-1 text-sm">Add your resume in the side panel to appear here.</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {resumes.map((r) => (
                        <article
                          key={r.id}
                          className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                        >
                          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm overflow-hidden">
                              {r.avatar_url ? (
                                <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(r.display_name)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900">{r.display_name}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">{r.headline}</p>
                              <p className="mt-2 text-sm text-gray-700 line-clamp-3">{r.summary}</p>
                              <a
                                href={r.resume_url?.startsWith('http') ? r.resume_url : `${typeof window !== 'undefined' ? window.location.origin : ''}${r.resume_url || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-blue-600 hover:underline"
                              >
                                View resume
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                              <p className="text-xs text-gray-400 mt-2">{formatDate(r.updated_at || r.created_at)}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </main>

          {/* Sidebar: Post job (admin) + Add resume (user) */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Contribute</h2>
                <p className="text-xs text-gray-500">Post a job or add your resume</p>
              </div>
              <div className="p-4 space-y-4">
                {user && isAdmin && (
                  <div>
                    {!showJobForm ? (
                      <button
                        type="button"
                        onClick={() => setShowJobForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium text-sm hover:bg-emerald-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Post a job
                      </button>
                    ) : (
                      <form onSubmit={handlePostJob} className="space-y-3">
                        <input
                          type="text"
                          value={jobForm.title}
                          onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Job title *"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          required
                        />
                        <input
                          type="text"
                          value={jobForm.company_name}
                          onChange={(e) => setJobForm((f) => ({ ...f, company_name: e.target.value }))}
                          placeholder="Company name *"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          required
                        />
                        <textarea
                          value={jobForm.description}
                          onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Description *"
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          required
                        />
                        <input
                          type="text"
                          value={jobForm.location}
                          onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
                          placeholder="Location (optional)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <select
                          value={jobForm.employment_type}
                          onChange={(e) => setJobForm((f) => ({ ...f, employment_type: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Employment type</option>
                          {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={jobForm.apply_url}
                          onChange={(e) => setJobForm((f) => ({ ...f, apply_url: e.target.value }))}
                          placeholder="Apply URL (optional)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        {jobError && <p className="text-sm text-red-600">{jobError}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowJobForm(false); setJobError(null) }}
                            className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={jobSending}
                            className="flex-1 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {jobSending ? 'Posting…' : 'Post job'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {user ? (
                  <div>
                    {myResume && !showResumeForm ? (
                      <div className="rounded-lg bg-gray-50 p-3 text-sm">
                        <p className="font-medium text-gray-900">Your resume is listed</p>
                        <p className="text-gray-500 mt-1 truncate">{myResume.headline}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowResumeForm(true)}
                            className="text-blue-600 font-medium hover:underline text-sm"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteResume}
                            className="text-red-600 font-medium hover:underline text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!showResumeForm ? (
                          <button
                            type="button"
                            onClick={() => setShowResumeForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-medium text-sm hover:bg-blue-100"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {myResume ? 'Update resume' : 'Add your resume'}
                          </button>
                        ) : (
                          <form onSubmit={handleSubmitResume} className="space-y-3">
                            <input
                              type="text"
                              value={resumeForm.headline}
                              onChange={(e) => setResumeForm((f) => ({ ...f, headline: e.target.value }))}
                              placeholder="Headline (e.g. Frontend Developer) *"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              required
                            />
                            <textarea
                              value={resumeForm.summary}
                              onChange={(e) => setResumeForm((f) => ({ ...f, summary: e.target.value }))}
                              placeholder="Short summary *"
                              rows={3}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              required
                            />
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Resume link or upload</label>
                              <input
                                type="url"
                                value={resumeForm.resume_url}
                                onChange={(e) => setResumeForm((f) => ({ ...f, resume_url: e.target.value }))}
                                placeholder="https://… or upload below"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              />
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf"
                                onChange={handleResumeFileChange}
                                className="mt-2 w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                              />
                              {resumeFile && <p className="mt-1 text-xs text-gray-500">Uploaded: {resumeFile.name}</p>}
                            </div>
                            {resumeError && <p className="text-sm text-red-600">{resumeError}</p>}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { setShowResumeForm(false); setResumeError(null) }}
                                className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={resumeSending || resumeUploading}
                                className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                {resumeSending || resumeUploading ? 'Saving…' : 'Save resume'}
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
                    {' '}to add your resume or post a job (admins).
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list:   ()       => api.get('/jobs/'),
  get:    (id)     => api.get(`/jobs/${id}`),
  create: (data)   => api.post('/jobs/', data),
  parse:  (desc)   => api.post('/jobs/parse', { description: desc }),
  delete: (id)     => api.delete(`/jobs/${id}`),
}

// ── Candidates ────────────────────────────────────────────────────────────────
export const candidatesApi = {
  top:          (jobId, limit = 10) => api.get(`/candidates/${jobId}/top?limit=${limit}`),
  get:          (id)                => api.get(`/candidates/profile/${id}`),
  updateStatus: (id, status, jobId) => api.patch(`/candidates/${id}/status`, { status, jobId }),
  uploadResume: (jobId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/candidates/${jobId}/upload-resume`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Email ─────────────────────────────────────────────────────────────────────
export const emailApi = {
  draft:        (candidateName, jobTitle) => api.post('/email/draft', { candidate_name: candidateName, job_title: jobTitle }),
  bulkDraft:    (candidates, jobTitle)    => api.post('/email/bulk-draft', { candidates, job_title: jobTitle }),
  parseReply:   (replyText)               => api.post('/email/parse-reply', { reply_text: replyText }),
}

// ── Feedback ──────────────────────────────────────────────────────────────────
export const feedbackApi = {
  submitInterviewer: (data) => api.post('/feedback/interviewer', data),
  submitCandidate:   (data) => api.post('/feedback/candidate',   data),
  summary:           (id)   => api.get(`/feedback/summary/${id}`),
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
export const pipelineApi = {
  dashboard:      ()      => api.get('/pipeline/stats/dashboard'),
  recentActivity: ()      => api.get('/pipeline/activity/recent'),
  timeline:       (jobId) => api.get(`/pipeline/${jobId}/timeline`),
  transition:     (data)  => api.post('/pipeline/transition', data),
}

// ── Job Portal Search ─────────────────────────────────────────────────────────
export const searchApi = {
  portals:      ()                         => api.get('/search/portals'),
  candidates:   (data)                     => api.post('/search/candidates', data),
  linkedinJobs: (title, location, limit)   => api.get('/search/linkedin-jobs', {
    params: { title, location: location || '', limit: limit || 10 },
  }),
}

export default api

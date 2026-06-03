import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('rr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register:          (data)     => api.post('/auth/register', data),
  login:             (data)     => api.post('/auth/login', data),
  me:                ()         => api.get('/auth/me'),
  users:             ()         => api.get('/auth/users'),
  deleteUser:        (id)       => api.delete(`/auth/users/${id}`),
  saveEmailSettings: (smtpPass) => api.post('/auth/email-settings', { smtp_pass: smtpPass }),
  getEmailSettings:  ()         => api.get('/auth/email-settings'),
  clearEmailSettings:()         => api.delete('/auth/email-settings'),
}

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
  draft:       (candidateName, jobTitle) => api.post('/email/draft', { candidate_name: candidateName, job_title: jobTitle }),
  bulkDraft:   (candidates, jobTitle)    => api.post('/email/bulk-draft', { candidates, job_title: jobTitle }),
  parseReply:  (replyText)               => api.post('/email/parse-reply', { reply_text: replyText }),
  send:        (to, subject, body)       => api.post('/email/send-smtp', { to, subject, body }),
  smtpStatus:  ()                        => api.get('/email/smtp-status'),
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

// ── LinkedIn via Unipile ──────────────────────────────────────────────────────
export const linkedinApi = {
  accounts:    ()                                     => api.get('/linkedin/accounts'),
  connectUrl:  (userId, userName)                     => api.get('/linkedin/connect', { params: { user_id: userId, user_name: userName } }),
  search:      (accountId, query, location, limit)    => api.get('/linkedin/search', { params: { account_id: accountId, query, location: location || '', limit: limit || 10 } }),
  sendMessage: (accountId, profileUrl, message)       => api.post('/linkedin/message', { account_id: accountId, profile_url: profileUrl, message }),
  disconnect:  (accountId)                            => api.delete(`/linkedin/accounts/${accountId}`),
}

// ── Job Portal Search ─────────────────────────────────────────────────────────
export const searchApi = {
  portals:    ()     => api.get('/search/portals'),
  candidates: (data) => api.post('/search/candidates', data),

  // Naukri session management
  getNaukriSession:    ()            => api.get('/search/naukri-session'),
  saveNaukriSession:   (curl)        => api.post('/search/naukri-session', { curl_command: curl }),
  deleteNaukriSession: ()            => api.delete('/search/naukri-session'),
  naukriScrape:        (curl, limit) => api.post('/search/naukri-scrape', {
    curl_command: curl, max_results: limit || 10, save_session: true,
  }),
}

export default api

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
  saveEmailSettings: (smtpPass, smtpEmail = '') => api.post('/auth/email-settings', { smtp_pass: smtpPass, smtp_email: smtpEmail }),
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
  fullProfile:  (id)                => api.get(`/candidates/profile/${id}/full`),
  listAll:      (params)            => api.get('/candidates/all', { params }),
  uploadToPool: (file, jobId) => {
    const form = new FormData()
    form.append('file', file)
    if (jobId) form.append('job_id', jobId)
    return api.post('/candidates/upload-resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  add:          (jobId, data)       => api.post(`/candidates/${jobId}`, data),
  remove:       (id, jobId)         => api.delete(`/candidates/${id}`, { params: { job_id: jobId } }),
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
  interviewers:      ()     => api.get('/feedback/interviewers'),
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
export const pipelineApi = {
  dashboard:      ()           => api.get('/pipeline/stats/dashboard'),
  recentActivity: ()           => api.get('/pipeline/activity/recent'),
  timeline:       (jobId)      => api.get(`/pipeline/${jobId}/timeline`),
  transition:     (data)       => api.post('/pipeline/transition', data),
  board:          (jobId)      => api.get(`/pipeline/board/${jobId}`),
  suggest:        (candidateId)=> api.get(`/pipeline/suggest/${candidateId}`),
}

// ── Microsoft Graph (Outlook OAuth) ──────────────────────────────────────────
export const msGraphApi = {
  status:      ()   => api.get('/msgraph/status'),
  authorizeUrl:()   => api.get('/msgraph/oauth/authorize'),
  disconnect:  ()   => api.delete('/msgraph/disconnect'),
}

// ── LinkedIn via Unipile ──────────────────────────────────────────────────────
export const linkedinApi = {
  accounts:    ()                                     => api.get('/linkedin/accounts'),
  connectUrl:  (userId, userName)                     => api.get('/linkedin/connect', { params: { user_id: userId, user_name: userName } }),
  search:      (accountId, query, location, limit)    => api.get('/linkedin/search', { params: { account_id: accountId, query, location: location || '', limit: limit || 10 } }),
  sendMessage: (accountId, profileUrl, message)       => api.post('/linkedin/message', { account_id: accountId, profile_url: profileUrl, message }),
  disconnect:  (accountId)                            => api.delete(`/linkedin/accounts/${accountId}`),
}

// ── Portal Settings (API credentials) ────────────────────────────────────────
export const portalSettingsApi = {
  getNaukri:    ()     => api.get('/portal-settings/naukri'),
  saveNaukri:   (data) => api.post('/portal-settings/naukri', data),
  clearNaukri:  ()     => api.delete('/portal-settings/naukri'),
  getLinkedIn:  ()     => api.get('/portal-settings/linkedin'),
  saveLinkedIn: (data) => api.post('/portal-settings/linkedin', data),
  clearLinkedIn:()     => api.delete('/portal-settings/linkedin'),
}

// ── Interviewers ──────────────────────────────────────────────────────────────
export const interviewersApi = {
  list:   ()                       => api.get('/interviewers/'),
  add:    (data)                   => api.post('/interviewers/', data),
  remove: (id)                     => api.delete(`/interviewers/${id}`),
  assign: (id, data)               => api.post(`/interviewers/${id}/assign`, data),
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

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: ()      => api.get('/analytics/overview'),
  funnel:   (jobId) => api.get(`/analytics/funnel/${jobId}`),
}

export default api

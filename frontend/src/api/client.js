const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('rotom_token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),
  updateMe: (payload) => request('/auth/me', { method: 'PATCH', body: payload, auth: true }),

  listClubs: (query = '') => request(`/clubs${query}`),
  getClub: (id) => request(`/clubs/${id}`),
  createClub: (payload) => request('/clubs', { method: 'POST', body: payload, auth: true }),  updateClub: (id, payload) => request(`/clubs/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteClub: (id) => request(`/clubs/${id}`, { method: 'DELETE', auth: true }),
  getClubOrgChart: (id) => request(`/clubs/${id}/org-chart`, { auth: true }),
  getClubMembership: (id) => request(`/clubs/${id}/membership`, { auth: true }),
  requestClubMembership: (id) => request(`/clubs/${id}/membership`, { method: 'POST', auth: true }),
  listClubMemberships: (id) => request(`/clubs/${id}/memberships`, { auth: true }),
  updateClubMembership: (clubId, membershipId, status) =>
    request(`/clubs/${clubId}/memberships/${membershipId}`, { method: 'PATCH', body: { status }, auth: true }),
  removeClubMembership: (clubId, membershipId) =>
    request(`/clubs/${clubId}/memberships/${membershipId}`, { method: 'DELETE', auth: true }),
  listEvents: (query = '') => request(`/events${query}`),
  listMyClubEvents: (query = '') => request(`/events/mine${query}`, { auth: true }),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (payload) => request('/events', { method: 'POST', body: payload, auth: true }),
  updateEvent: (id, payload) => request(`/events/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE', auth: true }),

  registerForEvent: (id) => request(`/events/${id}/register`, { method: 'POST', auth: true }),
  cancelRegistration: (id) => request(`/events/${id}/register`, { method: 'DELETE', auth: true }),
  listEventRegistrations: (id) => request(`/events/${id}/registrations`, { auth: true }),
  myRegistrations: () => request('/me/registrations', { auth: true }),

  listAttendance: (eventId) => request(`/events/${eventId}/attendance`, { auth: true }),
  markAttendance: (eventId, registrationId, attended) =>
    request(`/events/${eventId}/attendance`, { method: 'PATCH', body: { registrationId, attended }, auth: true }),

  listAnnouncements: (clubId) => request(clubId ? `/announcements?club=${clubId}` : '/announcements'),
  createAnnouncement: (payload) => request('/announcements', { method: 'POST', body: payload, auth: true }),
  updateAnnouncement: (id, payload) => request(`/announcements/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteAnnouncement: (id) => request(`/announcements/${id}`, { method: 'DELETE', auth: true }),

  getScheduleSuggestions: (count = 20) => request(`/schedule/suggestions?count=${count}`, { auth: true }),
  listScheduleBlocks: () => request('/schedule/blocks', { auth: true }),
  createScheduleBlock: (payload) => request('/schedule/blocks', { method: 'POST', body: payload, auth: true }),
  deleteScheduleBlock: (id) => request(`/schedule/blocks/${id}`, { method: 'DELETE', auth: true }),
  getEventIdeas: (clubId) => request(`/ai/event-ideas/${clubId}`, { method: 'POST', auth: true }),
  chatEventIdeas: (clubId, messages) => request(`/ai/chat/${clubId}`, { method: 'POST', body: { messages }, auth: true }),
};

export { getToken };

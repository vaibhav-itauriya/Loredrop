const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function getAuthToken(): Promise<string | null> {
  // First try to get token from localStorage (email auth)
  const token = localStorage.getItem('authToken');
  if (token) {
    return token;
  }
  
  // Fallback: try Firebase token if still configured
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
  } catch (err) {
    // Firebase not available or user not logged in
  }
  
  return null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    console.error(`API error: ${response.status}`, await response.text());
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Events API
export const eventsAPI = {
  getFeed: (page = 1, limit = 10, organizationId?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (organizationId) params.append('organizationId', organizationId);
    return fetchWithAuth(`${API_BASE_URL}/events/feed?${params}`);
  },

  getUpcoming: (limit = 5) => {
    return fetchWithAuth(`${API_BASE_URL}/events/upcoming?limit=${limit}`);
  },

  getEvent: (eventId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/events/${eventId}`);
  },

  createEvent: (data: any) => {
    return fetchWithAuth(`${API_BASE_URL}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getOrganizations: () => {
    return fetch(`${API_BASE_URL}/organizations`).then(r => r.json());
  },

  search: (query: string, page = 1, limit = 10) => {
    const params = new URLSearchParams({ q: query, page: String(page), limit: String(limit) });
    return fetchWithAuth(`${API_BASE_URL}/events/search?${params}`);
  },
};

// Interactions API
export const interactionsAPI = {
  toggleUpvote: (eventId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/upvote/${eventId}`, {
      method: 'POST',
    });
  },

  checkUpvote: (eventId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/upvote/${eventId}/check`);
  },

  addComment: (eventId: string, text: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/comments/${eventId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  getComments: (eventId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/comments/${eventId}`);
  },

  toggleCalendarSave: (eventId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/calendar/${eventId}`, {
      method: 'POST',
    });
  },

  checkCalendarSave: (eventId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/calendar/${eventId}/check`);
  },

  getCalendarSaves: () => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/calendar/saved/all`);
  },

  getNotifications: () => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/notifications`);
  },

  markNotificationRead: (notificationId: string) => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllNotificationsRead: () => {
    return fetchWithAuth(`${API_BASE_URL}/interactions/notifications/read/all`, {
      method: 'PATCH',
    });
  },
};

// Organizations API
export const organizationsAPI = {
  list: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/organizations`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      throw error;
    }
  },

  getBySlug: async (slug: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/organizations/${slug}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch organization ${slug}:`, error);
      throw error;
    }
  },
};

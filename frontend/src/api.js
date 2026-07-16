let rawApiUrl = process.env.REACT_APP_API_URL || 'https://bite-check-backend.vercel.app/api';
if (rawApiUrl.endsWith('/')) {
    rawApiUrl = rawApiUrl.slice(0, -1);
}
export const API_URL = rawApiUrl;

// --- IDENTITY & AUTHENTICATION ---

export const loginUser = async (credentials) => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
    }
    return response.json();
};

export const registerUser = async (userData) => {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
    }
    return response.json();
};

// --- SECURE FEEDBACK ---

export const submitFeedback = async (payload) => {
    const token = localStorage.getItem('ua_token');

    const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
    }
    return response.json();
};

// --- STALL MANAGEMENT ---

export const fetchStalls = async () => {
    const response = await fetch(`${API_URL}/stalls`);
    if (!response.ok) throw new Error('Failed to fetch stalls');
    return response.json();
};

export const addStall = async (name, image, email, canteen_group) => {
    const response = await fetch(`${API_URL}/stalls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image, email, canteen_group })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add stall');
    }
    return response.json();
};

export const editStall = async (id, name, image, email, canteen_group) => {
    const response = await fetch(`${API_URL}/stalls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image, email, canteen_group })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to edit stall');
    }
    return response.json();
};

export const sendStallReport = async (id) => {
    const response = await fetch(`${API_URL}/stalls/${id}/send-report`, {
        method: 'POST'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send report');
    }
    return response.json();
};

export const deleteStall = async (id) => {
    const response = await fetch(`${API_URL}/stalls/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete stall');
    return response.json();
};

// --- ADMIN ROUTES ---

export const getAllFeedbacks = async () => {
    const response = await fetch(`${API_URL}/feedbacks`);
    return response.json();
};

export const getAdminFeedbacks = async () => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/feedbacks`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getFeedbackPhoto = async (id) => {
    const response = await fetch(`${API_URL}/feedback/${id}/photo`);
    if (!response.ok) return null;
    return response.json();
};

export const verifyFeedback = async (data) => {
    const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
};

export const deleteFeedback = async (id) => {
    const response = await fetch(`${API_URL}/feedback/${id}`, { method: 'DELETE' });
    return response.json();
};

export const quarantineFeedback = async (id) => {
    const response = await fetch(`${API_URL}/feedback/${id}/quarantine`, { method: 'PUT' });
    return response.json();
};

export const getUserDemographics = async () => {
    const response = await fetch(`${API_URL}/admin/user-demographics`);
    if (!response.ok) throw new Error('Failed to fetch user demographics');
    return response.json();
};

export const forgotPassword = async (email) => {
    const response = await fetch(`${API_URL}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to process password reset request.');
    return data;
};

export const fetchUsers = async () => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/users`, {
        headers: { 
            'Authorization': token ? `Bearer ${token}` : '' 
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch registered users');
    }
    return response.json();
};

export const deleteUser = async (id) => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': token ? `Bearer ${token}` : '' 
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
    }
    return response.json();
};

export const fetchActiveCriteria = async () => {
    const response = await fetch(`${API_URL}/criteria`);
    if (!response.ok) throw new Error('Failed to fetch criteria');
    return response.json();
};

export const fetchAllCriteria = async () => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/criteria`, {
        headers: { 
            'Authorization': token ? `Bearer ${token}` : '' 
        }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch all criteria');
    }
    return response.json();
};

export const createCriteria = async (name) => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/criteria`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({ name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create criterion');
    return data;
};

export const updateCriteria = async (id, isActive) => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/criteria/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({ is_active: isActive })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update criterion');
    return data;
};

export const deleteCriteria = async (id) => {
    const token = localStorage.getItem('ua_token');
    const response = await fetch(`${API_URL}/admin/criteria/${id}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': token ? `Bearer ${token}` : '' 
        }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete criterion');
    return data;
};

export const loginWithGoogle = async (idToken) => {
    const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Google login failed');
    return data;
};

export const completeGoogleOnboarding = async ({ idToken, ua_id, academic_level }) => {
    const response = await fetch(`${API_URL}/auth/google/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, ua_id, academic_level })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Google onboarding failed');
    return data;
};
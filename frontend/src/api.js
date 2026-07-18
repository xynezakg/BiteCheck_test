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


// --- SECURE FEEDBACK ---

export const submitFeedback = async (payload) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));

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
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
    const response = await fetch(`${API_URL}/admin/feedbacks`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('ua_token');
            localStorage.removeItem('ua_user');
            sessionStorage.removeItem('ua_token');
            sessionStorage.removeItem('ua_user');
            window.location.href = '/';
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch admin feedbacks');
    }
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

export const verifyAdminPassword = async (password) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
    const response = await fetch(`${API_URL}/admin/verify-password`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Password verification failed');
    return data;
};

export const deleteFeedback = async (id, password) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
    const response = await fetch(`${API_URL}/feedback/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete record');
    return data;
};

export const purgeAllFeedbacks = async (password) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
    const response = await fetch(`${API_URL}/admin/feedbacks/purge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to purge records');
    return data;
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
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
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
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
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
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
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
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
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

export const updateCriteria = async (id, isActive, name) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
    const body = {};
    if (isActive !== undefined && isActive !== null) body.is_active = isActive;
    if (name !== undefined && name !== null) body.name = name;
    
    const response = await fetch(`${API_URL}/admin/criteria/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '' 
        },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update criterion');
    return data;
};

export const deleteCriteria = async (id) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
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

export const loginWithGoogle = async (idToken, acceptedToa = false, academicLevel = null) => {
    const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, acceptedToa, academicLevel })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Google login failed');
    return data;
};

export const updateUserAcademicLevel = async (id, academicLevel) => {
    const token = (localStorage.getItem('ua_token') || sessionStorage.getItem('ua_token'));
    const response = await fetch(`${API_URL}/admin/users/${id}/level`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ academicLevel })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update academic level');
    return data;
};
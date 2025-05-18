/**
 * Authentication API client
 */

/**
 * Login user
 * 
 * @param {string} username Username
 * @param {string} password Password
 * @returns {Promise<Object>} Response with user info and token
 */
async function login(username, password) {
    try {
        const response = await apiPost('auth/login', { username, password });
        
        if (!response.success) {
            throw new Error(response.message || 'Login failed');
        }
        
        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error(error.message || 'Login failed');
    }
}

/**
 * Logout user
 * 
 * @returns {Promise<boolean>} Whether logout was successful
 */
async function logout() {
    try {
        // Check if we have a token first
        if (!getToken()) {
            return true;
        }
        
        // Call logout endpoint
        await apiPost('auth/logout');
        
        // Clean up local storage
        removeToken();
        
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        
        // Still remove token on error
        removeToken();
        
        return false;
    }
}

/**
 * Refresh authentication token
 * 
 * @returns {Promise<string>} New token
 */
async function refreshToken() {
    try {
        const response = await apiPost('auth/refresh');
        
        if (!response.success || !response.data.token) {
            throw new Error('Token refresh failed');
        }
        
        // Save the new token
        const rememberMe = localStorage.getItem(TOKEN_KEY) !== null;
        saveToken(response.data.token, rememberMe);
        
        return response.data.token;
    } catch (error) {
        console.error('Token refresh error:', error);
        // If refresh fails, user needs to log in again
        removeToken();
        window.location.href = '../pages/login.html?session_expired=true';
        throw error;
    }
}

/**
 * Check authentication status
 * 
 * @returns {Promise<boolean>} Whether user is authenticated
 */
async function checkAuth() {
    try {
        // First check local token
        if (!isAuthenticated()) {
            return false;
        }
        
        // Verify with server
        const response = await apiGet('auth/check');
        return response.success;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

// Make functions available globally
window.login = login;
window.logout = logout;
window.refreshToken = refreshToken;
window.checkAuth = checkAuth;
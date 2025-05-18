/**
 * Token management utility functions
 */

// Token storage key
const TOKEN_KEY = config.authTokenName || 'payslip_auth_token';

// Session timeout in milliseconds
const SESSION_TIMEOUT = config.sessionTimeout || 30 * 60 * 1000; // 30 minutes default

// Last activity timestamp key
const LAST_ACTIVITY_KEY = 'payslip_last_activity';

/**
 * Save authentication token
 * 
 * @param {string} token JWT token
 * @param {boolean} rememberMe Whether to persist token after browser is closed
 */
function saveToken(token, rememberMe = false) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    updateLastActivity();
}

/**
 * Get authentication token
 * 
 * @returns {string|null} JWT token or null if not found
 */
function getToken() {
    // Check sessionStorage first, then localStorage
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove authentication token (logout)
 */
function removeToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * Check if user is authenticated
 * 
 * @returns {boolean} Whether the user is authenticated
 */
function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    
    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiration = payload.exp * 1000; // Convert to milliseconds
        
        if (Date.now() >= expiration) {
            removeToken();
            return false;
        }
        
        // Check session timeout
        if (isSessionExpired()) {
            removeToken();
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error parsing token:', error);
        removeToken();
        return false;
    }
}

/**
 * Update last activity timestamp
 */
function updateLastActivity() {
    const timestamp = Date.now().toString();
    
    // Store in the same storage as the token
    if (sessionStorage.getItem(TOKEN_KEY)) {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, timestamp);
    }
    
    if (localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(LAST_ACTIVITY_KEY, timestamp);
    }
}

/**
 * Check if session is expired due to inactivity
 * 
 * @returns {boolean} Whether the session is expired
 */
function isSessionExpired() {
    const lastActivity = parseInt(
        sessionStorage.getItem(LAST_ACTIVITY_KEY) || 
        localStorage.getItem(LAST_ACTIVITY_KEY) || 
        '0'
    );
    
    return Date.now() - lastActivity > SESSION_TIMEOUT;
}

/**
 * Get time remaining in session
 * 
 * @returns {number} Milliseconds remaining in session, or 0 if expired
 */
function getSessionTimeRemaining() {
    const lastActivity = parseInt(
        sessionStorage.getItem(LAST_ACTIVITY_KEY) || 
        localStorage.getItem(LAST_ACTIVITY_KEY) || 
        '0'
    );
    
    const remaining = SESSION_TIMEOUT - (Date.now() - lastActivity);
    return Math.max(0, remaining);
}

/**
 * Get user info from token
 * 
 * @returns {Object|null} User info object or null if not authenticated
 */
function getUserInfo() {
    const token = getToken();
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.user_id || payload.sub,
            username: payload.username,
            role: payload.role,
            name: payload.name || `${payload.firstname || ''} ${payload.lastname || ''}`.trim()
        };
    } catch (error) {
        console.error('Error parsing token payload:', error);
        return null;
    }
}

// Make functions available globally
window.saveToken = saveToken;
window.getToken = getToken;
window.removeToken = removeToken;
window.isAuthenticated = isAuthenticated;
window.updateLastActivity = updateLastActivity;
window.isSessionExpired = isSessionExpired;
window.getSessionTimeRemaining = getSessionTimeRemaining;
window.getUserInfo = getUserInfo;
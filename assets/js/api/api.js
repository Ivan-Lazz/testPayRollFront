/**
 * Make an API request
 * 
 * @param {string} endpoint API endpoint path
 * @param {Object} options Fetch options
 * @returns {Promise<Object>} Response data
 * @throws {Error} Request error
 */
async function apiRequest(endpoint, options = {}) {
    // Set default options
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        },
        // Remove credentials: 'include' since we're using token-based auth
        // and the backend has wildcard CORS
    };
    
    // Merge options
    const requestOptions = { ...defaultOptions, ...options };
    
    // Add authorization header if token exists
    const token = getToken();
    if (token) {
        requestOptions.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token if available
    const csrfToken = localStorage.getItem('csrf_token');
    if (csrfToken) {
        requestOptions.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Build URL - ensure there's no double slashes except in protocol
    const baseUrl = config.apiBaseUrl;
    let url = `${baseUrl}/${endpoint}`;
    url = url.replace(/([^:]\/)\/+/g, "$1"); // Replace multiple slashes with single slash
    
    // For debugging
    console.log(`Making API request to: ${url}`);
    console.log('Request options:', JSON.stringify(requestOptions));
    
    try {
        // Make request
        const response = await fetch(url, requestOptions);
        
        // Log response status for debugging
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        // Get CSRF token from response headers if available
        const newCsrfToken = response.headers.get('X-CSRF-Token');
        if (newCsrfToken) {
            localStorage.setItem('csrf_token', newCsrfToken);
        }
        
        // Parse response
        let data;
        
        try {
            const responseText = await response.text();
            console.log('Response text:', responseText);
            
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                // Improved error handling for invalid JSON
                if (response.ok) {
                    // If status is OK but JSON is invalid, create a simple success response
                    data = { 
                        success: true, 
                        message: 'Operation completed successfully', 
                        raw: responseText 
                    };
                } else {
                    // If status is not OK and JSON is invalid
                    data = { 
                        success: false, 
                        message: `Error ${response.status}: ${response.statusText}`, 
                        raw: responseText 
                    };
                }
            }
        } catch (e) {
            console.error('Error reading response text:', e);
            data = { 
                success: false, 
                message: 'Failed to read server response' 
            };
        }
        
        // Check if token expired and logout if necessary
        if (response.status === 401) {
            removeToken();
            
            // Only redirect if we're not on the login page
            if (!window.location.href.includes('login.html')) {
                window.location.href = '../pages/login.html?session_expired=true';
                throw new Error('Your session has expired. Please log in again.');
            }
        }
        
        // Handle error responses with improved messaging
        if (!response.ok) {
            const errorMessage = data.message || 
                                `Error: ${response.status} ${response.statusText}`;
            
            // Create more user-friendly error messages based on status codes
            let userFriendlyMessage;
            switch (response.status) {
                case 400:
                    userFriendlyMessage = 'The request contains invalid data. Please check your inputs.';
                    break;
                case 403:
                    userFriendlyMessage = 'You do not have permission to perform this action.';
                    break;
                case 404:
                    userFriendlyMessage = 'The requested resource was not found.';
                    break;
                case 500:
                    userFriendlyMessage = 'A server error occurred. Please try again later.';
                    break;
                default:
                    userFriendlyMessage = errorMessage;
            }
            
            // Include both technical and user-friendly messages
            const error = new Error(userFriendlyMessage);
            error.technical = errorMessage;
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        // Update last activity timestamp
        if (isAuthenticated()) {
            updateLastActivity();
        }
        
        return data;
    } catch (error) {
        console.error(`API Request Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Make a GET request to the API
 * 
 * @param {string} endpoint API endpoint path
 * @param {Object} queryParams Query parameters
 * @returns {Promise<Object>} Response data
 */
async function apiGet(endpoint, queryParams = {}) {
    // Convert query params to URL query string
    const queryString = Object.entries(queryParams)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return await apiRequest(url);
}

/**
 * Make a POST request to the API
 * 
 * @param {string} endpoint API endpoint path
 * @param {Object} data Request body data
 * @returns {Promise<Object>} Response data
 */
async function apiPost(endpoint, data = {}) {
    return await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * Make a PUT request to the API
 * 
 * @param {string} endpoint API endpoint path
 * @param {Object} data Request body data
 * @returns {Promise<Object>} Response data
 */
async function apiPut(endpoint, data = {}) {
    return await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * Make a DELETE request to the API
 * 
 * @param {string} endpoint API endpoint path
 * @returns {Promise<Object>} Response data
 */
async function apiDelete(endpoint) {
    return await apiRequest(endpoint, {
        method: 'DELETE'
    });
}

/**
 * Standardize field names to match backend expectations
 * 
 * @param {Object} data Form data
 * @param {string} formType Type of form ('user', 'employee', 'account', etc.)
 * @returns {Object} Standardized data
 */
function standardizeFormData(data, formType) {
    const standardizedData = { ...data };
    
    // Convert string numbers to actual numbers
    if (formType === 'payslip') {
        if (standardizedData.salary) standardizedData.salary = parseFloat(standardizedData.salary);
        if (standardizedData.bonus) standardizedData.bonus = parseFloat(standardizedData.bonus);
        if (standardizedData.bank_account_id) standardizedData.bank_account_id = parseInt(standardizedData.bank_account_id);
    }
    
    // Ensure field name consistency between frontend and backend
    // Map frontend field names to backend field names if needed
    const fieldMappings = {
        // Example: 'frontendFieldName': 'backendFieldName'
    };
    
    Object.keys(fieldMappings).forEach(frontendField => {
        if (standardizedData[frontendField] !== undefined) {
            standardizedData[fieldMappings[frontendField]] = standardizedData[frontendField];
            delete standardizedData[frontendField];
        }
    });
    
    return standardizedData;
}

/**
 * Handle API errors and display notifications
 * 
 * @param {Error} error Error object
 * @param {string} defaultMessage Default error message
 */
function handleApiError(error, defaultMessage) {
    const errorMessage = error.message || defaultMessage || 'An error occurred';
    const technicalMessage = error.technical || error.message;
    
    console.error('API Error:', technicalMessage);
    
    // Check if showNotification function exists before calling it
    if (typeof showNotification === 'function') {
        showNotification('error', 'Error', errorMessage);
    } else {
        alert(`Error: ${errorMessage}`);
    }
    
    // You could also log the technical message for debugging
    if (config && config.debugMode && error.technical) {
        console.debug('Technical error details:', error.technical);
    }
}

// Make functions available globally
window.apiRequest = apiRequest;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.standardizeFormData = standardizeFormData;
window.handleApiError = handleApiError;
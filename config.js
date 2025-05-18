/**
 * Pay Slip Generator System Configuration
 */
const config = {
    // API Endpoint URL - Determine dynamically based on current hostname
    apiBaseUrl: (function() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost/testPayRoll/api';
        } else {
            // For production environment
            // This assumes the API is on the same domain as the frontend
            return window.location.protocol + '//' + hostname + '/api';
        }
    })(),
    
    // Company Information
    companyName: 'Your Company Name',
    companyLogo: 'assets/img/logo.png',
    
    // Authentication settings
    authTokenName: 'payslip_auth_token',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
    
    // Pagination defaults
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],

    // Debug settings
    debugMode: window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1',
    
    // Account types
    accountTypes: [
        'Team Leader',
        'Overflow',
        'Auto-Warranty',
        'Commissions'
    ],
    
    // Account statuses
    accountStatuses: [
        'Active',
        'Inactive',
        'Suspended'
    ],
    
    // Payment statuses
    paymentStatuses: [
        'Paid',
        'Pending',
        'Cancelled'
    ]
};
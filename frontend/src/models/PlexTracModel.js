import axios from 'axios';

// PlexTrac API configuration
const PLEXTRAC_BASE_URL = import.meta.env.VITE_PLEXTRAC_BASE_URL || '';
const PLEXTRAC_API_KEY = import.meta.env.VITE_PLEXTRAC_API_KEY || '';

// Create axios instance for PlexTrac API
const plextracApi = axios.create({
  baseURL: PLEXTRAC_BASE_URL ? `${PLEXTRAC_BASE_URL}/api/v1` : '',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': PLEXTRAC_API_KEY ? `Bearer ${PLEXTRAC_API_KEY}` : '',
  },
});

// Mock data for when API is not configured
const mockReports = [
  {
    id: 'RPT-2024-001',
    title: 'Acme Corporation - External Penetration Test',
    client: 'Acme Corporation',
    engagement: 'ENG-2024-001',
    executiveSummary: 'This report details the findings from a comprehensive external penetration test conducted against Acme Corporation\'s public-facing infrastructure. The assessment identified several critical vulnerabilities that could lead to unauthorized access and data exposure.',
    scope: 'External network penetration test covering public IP ranges, web applications, and API endpoints.',
    methodology: 'OWASP Testing Guide v4.0, PTES Framework',
    findings: [
      {
        id: 'FND-001',
        title: 'SQL Injection in Login Form',
        severity: 'critical',
        description: 'The login form at /login is vulnerable to SQL injection attacks. An attacker can manipulate the username parameter to execute arbitrary SQL queries against the database.',
        impact: 'An attacker could gain unauthorized access to user accounts, extract sensitive data from the database, and potentially achieve remote code execution on the database server.',
        recommendation: 'Implement parameterized queries or prepared statements. Use an ORM framework that handles SQL injection prevention. Input validation and output encoding should also be implemented.',
        cvss: '9.8',
        cwe: 'CWE-89',
        status: 'open',
        remediation: 'High priority - Patch within 30 days',
      },
      {
        id: 'FND-002',
        title: 'Weak Password Policy',
        severity: 'high',
        description: 'The application does not enforce strong password requirements. Users can create accounts with weak passwords such as "password123" or "admin".',
        impact: 'Weak passwords are easily compromised through brute force attacks, credential stuffing, or social engineering, leading to unauthorized account access.',
        recommendation: 'Implement a strong password policy requiring: minimum 12 characters, mix of uppercase/lowercase, numbers, and special characters. Enforce password history and prevent common passwords.',
        cvss: '7.5',
        cwe: 'CWE-521',
        status: 'open',
        remediation: 'Medium priority - Patch within 60 days',
      },
      {
        id: 'FND-003',
        title: 'Missing Security Headers',
        severity: 'medium',
        description: 'The web application is missing several important security headers including Content-Security-Policy, X-Frame-Options, and Strict-Transport-Security.',
        impact: 'Missing security headers increase the risk of XSS attacks, clickjacking, and man-in-the-middle attacks.',
        recommendation: 'Implement comprehensive security headers: Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security, and Referrer-Policy.',
        cvss: '5.3',
        cwe: 'CWE-693',
        status: 'open',
        remediation: 'Low priority - Patch within 90 days',
      },
      {
        id: 'FND-004',
        title: 'Exposed API Keys in JavaScript',
        severity: 'high',
        description: 'API keys and authentication tokens are exposed in client-side JavaScript code, making them accessible to anyone who views the page source.',
        impact: 'Exposed API keys can be used by attackers to make unauthorized API calls, potentially accessing sensitive data or performing actions on behalf of the application.',
        recommendation: 'Move API keys to server-side code. Use environment variables for sensitive configuration. Implement proper API authentication and rate limiting.',
        cvss: '8.1',
        cwe: 'CWE-798',
        status: 'open',
        remediation: 'High priority - Patch within 30 days',
      },
      {
        id: 'FND-005',
        title: 'Insufficient Session Management',
        severity: 'medium',
        description: 'Session tokens do not expire and are not properly invalidated on logout. Sessions remain active indefinitely.',
        impact: 'If a session token is compromised, an attacker can maintain access to the account indefinitely, even after the legitimate user logs out.',
        recommendation: 'Implement session timeout (15 minutes of inactivity). Properly invalidate sessions on logout. Use secure, HttpOnly cookies for session storage.',
        cvss: '6.5',
        cwe: 'CWE-613',
        status: 'open',
        remediation: 'Medium priority - Patch within 60 days',
      },
    ],
    conclusion: 'The assessment identified 5 security vulnerabilities, including 1 critical and 2 high-severity issues. Immediate remediation is recommended for the critical SQL injection vulnerability. The organization should implement a comprehensive security program including regular security assessments, secure coding practices, and security awareness training.',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    status: 'draft',
  },
  {
    id: 'RPT-2024-002',
    title: 'TechStart Inc - Internal Security Assessment',
    client: 'TechStart Inc',
    engagement: 'ENG-2024-002',
    executiveSummary: 'Internal security assessment of TechStart Inc\'s corporate network and Active Directory environment. The assessment revealed several misconfigurations and privilege escalation paths.',
    scope: 'Internal network assessment, Active Directory enumeration, privilege escalation testing, and lateral movement analysis.',
    methodology: 'PTES Framework, Active Directory Security Assessment Methodology',
    findings: [
      {
        id: 'FND-006',
        title: 'Kerberoastable Service Accounts',
        severity: 'high',
        description: 'Multiple service accounts are configured with weak passwords and are vulnerable to Kerberoasting attacks.',
        impact: 'Attackers can extract service account password hashes and crack them offline, potentially gaining access to sensitive services and data.',
        recommendation: 'Implement strong password policies for service accounts. Consider using Group Managed Service Accounts (gMSAs). Regularly rotate service account passwords.',
        cvss: '7.8',
        cwe: 'CWE-521',
        status: 'open',
        remediation: 'High priority - Patch within 30 days',
      },
      {
        id: 'FND-007',
        title: 'Unconstrained Delegation Misconfiguration',
        severity: 'critical',
        description: 'Several servers have unconstrained delegation enabled, allowing attackers to impersonate any user to any service.',
        impact: 'An attacker with access to a server with unconstrained delegation can impersonate domain administrators and gain full domain control.',
        recommendation: 'Disable unconstrained delegation. Use constrained or resource-based constrained delegation where necessary. Regularly audit delegation settings.',
        cvss: '9.1',
        cwe: 'CWE-284',
        status: 'open',
        remediation: 'Critical priority - Patch within 7 days',
      },
      {
        id: 'FND-008',
        title: 'Weak Domain Password Policy',
        severity: 'medium',
        description: 'The domain password policy allows passwords as short as 8 characters with no complexity requirements.',
        impact: 'Weak passwords are easily compromised, increasing the risk of unauthorized access to domain accounts.',
        recommendation: 'Implement a strong password policy: minimum 14 characters, complexity requirements, password history, and account lockout after failed attempts.',
        cvss: '5.3',
        cwe: 'CWE-521',
        status: 'open',
        remediation: 'Medium priority - Patch within 60 days',
      },
    ],
    conclusion: 'The internal assessment identified critical Active Directory misconfigurations that could lead to complete domain compromise. Immediate action is required to address the unconstrained delegation vulnerability.',
    createdAt: '2024-01-22T09:00:00Z',
    updatedAt: '2024-01-25T16:00:00Z',
    status: 'in-review',
  },
  {
    id: 'RPT-2024-003',
    title: 'Global Finance Corp - Web Application Security Assessment',
    client: 'Global Finance Corp',
    engagement: 'ENG-2024-003',
    executiveSummary: 'Comprehensive web application security assessment of Global Finance Corp\'s online banking platform. The assessment focused on authentication, authorization, and data protection mechanisms.',
    scope: 'Web application security testing, API security assessment, authentication and session management review.',
    methodology: 'OWASP Testing Guide v4.0, OWASP API Security Top 10',
    findings: [
      {
        id: 'FND-009',
        title: 'Insecure Direct Object Reference (IDOR)',
        severity: 'high',
        description: 'The application allows users to access other users\' account information by manipulating the account ID parameter in API requests.',
        impact: 'Attackers can access sensitive financial information of other users, violating privacy and potentially leading to financial fraud.',
        recommendation: 'Implement proper authorization checks on all API endpoints. Verify that users can only access resources they are authorized to view. Use indirect object references where possible.',
        cvss: '8.1',
        cwe: 'CWE-639',
        status: 'open',
        remediation: 'High priority - Patch within 30 days',
      },
      {
        id: 'FND-010',
        title: 'Missing Multi-Factor Authentication',
        severity: 'high',
        description: 'The application does not require multi-factor authentication for sensitive operations such as fund transfers or account modifications.',
        impact: 'If user credentials are compromised, attackers can perform sensitive financial transactions without additional verification.',
        recommendation: 'Implement MFA for all sensitive operations. Use time-based one-time passwords (TOTP) or SMS-based verification. Consider hardware security keys for high-value accounts.',
        cvss: '7.4',
        cwe: 'CWE-308',
        status: 'open',
        remediation: 'High priority - Patch within 30 days',
      },
    ],
    conclusion: 'The web application assessment identified critical authorization flaws that could lead to unauthorized access to customer financial data. Immediate remediation is required.',
    createdAt: '2024-01-28T10:00:00Z',
    updatedAt: '2024-01-30T15:00:00Z',
    status: 'published',
  },
];

// Fetch reports from PlexTrac API
export async function fetchPlexTracReports() {
  // If API is not configured, return mock data
  if (!PLEXTRAC_BASE_URL || !PLEXTRAC_API_KEY) {
    console.log('PlexTrac API not configured, using mock data');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockReports;
  }

  try {
    const response = await plextracApi.get('/reports', {
      params: {
        limit: 100,
      },
    });

    // Transform PlexTrac API response to our format
    return response.data.reports.map((report) => ({
      id: report.id || report.reportId,
      title: report.title || report.name,
      client: report.client || report.clientName,
      engagement: report.engagement || report.engagementCode,
      executiveSummary: report.executiveSummary || '',
      scope: report.scope || '',
      methodology: report.methodology || '',
      findings: report.findings || [],
      conclusion: report.conclusion || '',
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: report.updatedAt || new Date().toISOString(),
      status: report.status || 'draft',
    }));
  } catch (error) {
    console.error('Error fetching PlexTrac reports:', error);
    // Fallback to mock data on error
    return mockReports;
  }
}

// Fetch a single report by ID
export async function fetchPlexTracReport(reportId) {
  // If API is not configured, return mock data
  if (!PLEXTRAC_BASE_URL || !PLEXTRAC_API_KEY) {
    const report = mockReports.find(r => r.id === reportId);
    return report || null;
  }

  try {
    const response = await plextracApi.get(`/reports/${reportId}`);
    const report = response.data;
    
    return {
      id: report.id || report.reportId,
      title: report.title || report.name,
      client: report.client || report.clientName,
      engagement: report.engagement || report.engagementCode,
      executiveSummary: report.executiveSummary || '',
      scope: report.scope || '',
      methodology: report.methodology || '',
      findings: report.findings || [],
      conclusion: report.conclusion || '',
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: report.updatedAt || new Date().toISOString(),
      status: report.status || 'draft',
    };
  } catch (error) {
    console.error('Error fetching PlexTrac report:', error);
    return null;
  }
}


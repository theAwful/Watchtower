import axios from 'axios';

// Atlassian API configuration
const ATLASSIAN_BASE_URL = import.meta.env.VITE_ATLASSIAN_BASE_URL || '';
const ATLASSIAN_EMAIL = import.meta.env.VITE_ATLASSIAN_EMAIL || '';
const ATLASSIAN_API_TOKEN = import.meta.env.VITE_ATLASSIAN_API_TOKEN || '';

// Create axios instance for Atlassian API
const atlassianApi = axios.create({
  baseURL: ATLASSIAN_BASE_URL ? `${ATLASSIAN_BASE_URL}/rest/api` : '',
  auth: ATLASSIAN_EMAIL && ATLASSIAN_API_TOKEN
    ? {
        username: ATLASSIAN_EMAIL,
        password: ATLASSIAN_API_TOKEN,
      }
    : undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data for when API is not configured
const mockPages = [
  {
    id: '101',
    title: 'Penetration Testing Methodology',
    content: `# Penetration Testing Methodology

## Overview
This document outlines our standard penetration testing methodology based on industry best practices and frameworks.

## Phases

### 1. Reconnaissance
- **Passive Reconnaissance**: Gathering information without direct interaction
  - DNS enumeration
  - Subdomain discovery
  - OSINT gathering
  - Certificate transparency logs

- **Active Reconnaissance**: Direct interaction with target systems
  - Port scanning
  - Service enumeration
  - Banner grabbing

### 2. Scanning & Enumeration
- Network scanning (Nmap, Masscan)
- Service identification
- Vulnerability scanning
- Web application enumeration

### 3. Exploitation
- Exploit development
- Proof of concept creation
- Privilege escalation
- Lateral movement

### 4. Post-Exploitation
- Data exfiltration
- Persistence mechanisms
- Cleanup procedures

### 5. Reporting
- Executive summary
- Technical findings
- Risk assessment
- Remediation recommendations

## Tools
- **Reconnaissance**: Recon-ng, theHarvester, Shodan
- **Scanning**: Nmap, Masscan, Nessus
- **Exploitation**: Metasploit, Burp Suite, SQLMap
- **Post-Exploitation**: Mimikatz, BloodHound, Cobalt Strike`,
    category: 'Methodology',
    tags: ['methodology', 'pentesting', 'framework'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '102',
    title: 'OWASP Top 10 2024 - Common Vulnerabilities',
    content: `# OWASP Top 10 2024

## A01:2021 - Broken Access Control
**Description**: Access control enforces policies such that users cannot act outside of their intended permissions.

**Examples**:
- Vertical privilege escalation
- Horizontal privilege escalation
- Unprotected APIs
- Directory traversal

**Remediation**:
- Implement proper access controls
- Use principle of least privilege
- Validate permissions on every request

## A02:2021 - Cryptographic Failures
**Description**: Failures related to cryptography which often lead to exposure of sensitive data.

**Examples**:
- Weak encryption algorithms
- Hardcoded keys
- Insufficient entropy
- Missing encryption

**Remediation**:
- Use strong encryption (AES-256, RSA-2048+)
- Proper key management
- Encrypt data at rest and in transit

## A03:2021 - Injection
**Description**: Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query.

**Types**:
- SQL Injection
- Command Injection
- LDAP Injection
- XPath Injection

**Remediation**:
- Use parameterized queries
- Input validation
- Output encoding
- Least privilege database accounts`,
    category: 'References',
    tags: ['owasp', 'vulnerabilities', 'web-security'],
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-25T16:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '103',
    title: 'Network Penetration Testing Checklist',
    content: `# Network Penetration Testing Checklist

## Pre-Engagement
- [ ] Scope definition
- [ ] Rules of engagement
- [ ] Legal authorization
- [ ] Contact information
- [ ] Emergency procedures

## Information Gathering
- [ ] DNS enumeration
- [ ] Subdomain discovery
- [ ] IP range identification
- [ ] Technology stack identification
- [ ] Employee information (OSINT)

## Network Scanning
- [ ] Port scanning (TCP/UDP)
- [ ] Service enumeration
- [ ] OS detection
- [ ] Version detection
- [ ] Firewall detection

## Vulnerability Assessment
- [ ] Vulnerability scanning
- [ ] Manual verification
- [ ] False positive analysis
- [ ] Risk assessment

## Exploitation
- [ ] Exploit research
- [ ] Proof of concept
- [ ] Privilege escalation
- [ ] Lateral movement
- [ ] Data access verification

## Post-Exploitation
- [ ] Persistence mechanisms
- [ ] Data exfiltration paths
- [ ] Impact assessment
- [ ] Cleanup procedures

## Reporting
- [ ] Executive summary
- [ ] Technical findings
- [ ] Risk ratings
- [ ] Remediation steps
- [ ] Proof of concept code`,
    category: 'Procedures',
    tags: ['checklist', 'network', 'pentesting'],
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '104',
    title: 'Web Application Testing Guide',
    content: `# Web Application Testing Guide

## Initial Reconnaissance
1. **Spidering/Crawling**
   - Burp Suite Spider
   - OWASP ZAP
   - Custom scripts

2. **Technology Identification**
   - Wappalyzer
   - BuiltWith
   - Response headers

3. **Directory Enumeration**
   - Gobuster
   - Dirb
   - Dirsearch

## Authentication Testing
- [ ] Username enumeration
- [ ] Password policy testing
- [ ] Brute force protection
- [ ] Account lockout mechanisms
- [ ] Session management
- [ ] Password reset functionality
- [ ] Multi-factor authentication

## Authorization Testing
- [ ] Horizontal privilege escalation
- [ ] Vertical privilege escalation
- [ ] Direct object references (IDOR)
- [ ] Function-level access control
- [ ] Path traversal

## Input Validation
- [ ] SQL Injection
- [ ] XSS (Reflected, Stored, DOM)
- [ ] Command Injection
- [ ] XXE Injection
- [ ] SSRF
- [ ] File upload vulnerabilities
- [ ] Template Injection

## Business Logic
- [ ] Workflow bypass
- [ ] Price manipulation
- [ ] Quantity manipulation
- [ ] Race conditions
- [ ] Time-based attacks

## Client-Side Testing
- [ ] JavaScript analysis
- [ ] Source code review
- [ ] Local storage inspection
- [ ] Cookie analysis
- [ ] CORS misconfiguration

## Tools
- **Proxy**: Burp Suite, OWASP ZAP
- **Scanners**: Nikto, Acunetix
- **Fuzzers**: wfuzz, ffuf
- **SQL Injection**: SQLMap
- **XSS**: XSSer, XSS Hunter`,
    category: 'Procedures',
    tags: ['web-app', 'testing', 'guide'],
    createdAt: '2024-01-22T13:00:00Z',
    updatedAt: '2024-01-22T13:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '105',
    title: 'Common Exploitation Techniques',
    content: `# Common Exploitation Techniques

## SQL Injection
### Union-Based
\`\`\`sql
' UNION SELECT null, username, password FROM users--
\`\`\`

### Boolean-Based Blind
\`\`\`sql
' AND 1=1--
' AND 1=2--
\`\`\`

### Time-Based Blind
\`\`\`sql
'; WAITFOR DELAY '00:00:05'--
\`\`\`

## Command Injection
### Basic
\`\`\`
; ls
| whoami
\` cat /etc/passwd
\`\`\`

### Advanced
\`\`\`
$(id)
\`id\`
; id; #
\`\`\`

## XSS (Cross-Site Scripting)
### Reflected
\`\`\`html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
\`\`\`

### Stored
\`\`\`html
<svg onload=alert('XSS')>
<body onload=alert('XSS')>
\`\`\`

## XXE (XML External Entity)
\`\`\`xml
<?xml version="1.0"?>
<!DOCTYPE foo [
<!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>
\`\`\`

## SSRF (Server-Side Request Forgery)
\`\`\`
http://internal-server:8080/admin
file:///etc/passwd
gopher://internal:3306
\`\`\`

## File Upload Bypass
- Change extension: .php → .phtml, .php5
- Double extension: shell.php.jpg
- Null byte: shell.php%00.jpg
- Case variation: shell.PhP`,
    category: 'References',
    tags: ['exploitation', 'techniques', 'payloads'],
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '106',
    title: 'Active Directory Penetration Testing',
    content: `# Active Directory Penetration Testing

## Initial Enumeration
### Tools
- **BloodHound**: AD relationship mapping
- **PowerView**: PowerShell AD enumeration
- **Impacket**: Python AD tools
- **Rubeus**: Kerberos exploitation

### Commands
\`\`\`powershell
# Domain info
Get-ADDomain

# Users
Get-ADUser -Filter *

# Groups
Get-ADGroup -Filter *

# Computers
Get-ADComputer -Filter *
\`\`\`

## Common Attack Vectors

### 1. Kerberoasting
- Request service tickets
- Extract hashes
- Crack offline

### 2. AS-REP Roasting
- Target accounts without pre-auth
- Extract TGT hashes
- Crack offline

### 3. Pass-the-Hash
- Use NTLM hashes
- Lateral movement
- No password needed

### 4. DCSync
- Replicate AD database
- Extract all password hashes
- Requires Domain Admin or equivalent

### 5. Golden Ticket
- Forge Kerberos tickets
- Domain persistence
- Requires KRBTGT hash

### 6. Silver Ticket
- Forge service tickets
- Service-specific access

## Privilege Escalation
- **Unconstrained Delegation**: Abuse trusted accounts
- **Constrained Delegation**: Abuse service accounts
- **Resource-Based Delegation**: Abuse computer objects
- **ACL Abuse**: Exploit misconfigured permissions

## Lateral Movement
- **WMI**: Remote command execution
- **PSExec**: Remote service execution
- **WinRM**: Remote PowerShell
- **RDP**: Remote desktop
- **SMB**: File share access

## Persistence
- Golden/Silver tickets
- DCSync permissions
- Scheduled tasks
- Service accounts
- GPO modifications`,
    category: 'Infrastructure',
    tags: ['active-directory', 'windows', 'ad'],
    createdAt: '2024-01-25T09:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '107',
    title: 'Cloud Security Testing - AWS',
    content: `# Cloud Security Testing - AWS

## Reconnaissance
### Tools
- **Pacu**: AWS exploitation framework
- **CloudBrute**: Cloud resource enumeration
- **S3Scanner**: S3 bucket discovery

### Enumeration
\`\`\`bash
# List S3 buckets
aws s3 ls

# Check bucket permissions
aws s3api get-bucket-acl --bucket example

# List EC2 instances
aws ec2 describe-instances

# List IAM users
aws iam list-users
\`\`\`

## Common Misconfigurations

### S3 Buckets
- Public read/write access
- Missing encryption
- Versioning disabled
- No logging

### IAM
- Overly permissive policies
- Wildcard actions
- Missing MFA
- Service account keys

### EC2
- Public SSH/RDP access
- Weak security groups
- Missing encryption
- Exposed metadata

### RDS
- Public accessibility
- Weak encryption
- Default credentials
- No backups

## Testing Checklist
- [ ] S3 bucket enumeration
- [ ] IAM policy review
- [ ] Security group analysis
- [ ] CloudTrail review
- [ ] VPC configuration
- [ ] Key pair security
- [ ] Lambda function review
- [ ] CloudFormation templates

## Tools
- **Pacu**: AWS exploitation
- **Cloudsplaining**: IAM policy analysis
- **Scout Suite**: Multi-cloud security
- **S3Scanner**: Bucket discovery`,
    category: 'Infrastructure',
    tags: ['aws', 'cloud', 'security'],
    createdAt: '2024-01-28T14:00:00Z',
    updatedAt: '2024-01-28T14:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
  {
    id: '108',
    title: 'Report Writing Best Practices',
    content: `# Report Writing Best Practices

## Structure

### Executive Summary
- High-level overview
- Business impact
- Key findings
- Recommendations summary
- Target: C-level executives

### Technical Summary
- Detailed findings
- Technical impact
- Affected systems
- Target: Technical teams

### Detailed Findings
- Vulnerability description
- Proof of concept
- Risk rating
- Remediation steps
- References

## Risk Rating

### Critical
- Remote code execution
- Complete system compromise
- Data breach
- Financial impact > $1M

### High
- Privilege escalation
- Significant data access
- Service disruption
- Financial impact $100K-$1M

### Medium
- Limited data access
- Information disclosure
- Moderate impact
- Financial impact $10K-$100K

### Low
- Information disclosure
- Minor configuration issues
- Limited impact
- Financial impact < $10K

## Writing Tips
1. **Be Clear**: Avoid jargon, explain technical terms
2. **Be Specific**: Include exact steps to reproduce
3. **Be Actionable**: Provide clear remediation steps
4. **Be Professional**: Maintain objectivity
5. **Be Visual**: Use screenshots and diagrams

## Tools
- **Dradis**: Collaborative reporting
- **Serpico**: Report generation
- **LaTeX**: Professional formatting
- **Markdown**: Quick documentation`,
    category: 'Procedures',
    tags: ['reporting', 'documentation', 'best-practices'],
    createdAt: '2024-01-30T10:00:00Z',
    updatedAt: '2024-01-30T10:00:00Z',
    author: 'Security Team',
    space: 'PENTEST',
  },
];

// Fetch pages from Confluence API
export async function fetchConfluencePages(spaceKey) {
  // If API is not configured, return mock data
  if (!ATLASSIAN_BASE_URL || !ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.log('Atlassian API not configured, using mock data');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPages;
  }

  try {
    const space = spaceKey || 'PENTEST';
    const response = await atlassianApi.get(`/content`, {
      params: {
        spaceKey: space,
        expand: 'body.storage,version,space',
        limit: 100,
      },
    });

    // Transform Confluence API response to our format
    return response.data.results.map((page) => ({
      id: page.id,
      title: page.title,
      content: page.body?.storage?.value || '',
      category: page.space?.name || 'General',
      tags: page.metadata?.labels?.results?.map((l) => l.name) || [],
      createdAt: page.version?.when || new Date().toISOString(),
      updatedAt: page.version?.when || new Date().toISOString(),
      author: page.version?.by?.displayName || 'Unknown',
      space: page.space?.key || space,
    }));
  } catch (error) {
    console.error('Error fetching Confluence pages:', error);
    // Fallback to mock data on error
    return mockPages;
  }
}

// Fetch a single page by ID
export async function fetchConfluencePage(pageId) {
  // If API is not configured, return mock data
  if (!ATLASSIAN_BASE_URL || !ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    const page = mockPages.find(p => p.id === pageId);
    return page || null;
  }

  try {
    const response = await atlassianApi.get(`/content/${pageId}`, {
      params: {
        expand: 'body.storage,version,space',
      },
    });

    const page = response.data;
    return {
      id: page.id,
      title: page.title,
      content: page.body?.storage?.value || '',
      category: page.space?.name || 'General',
      tags: page.metadata?.labels?.results?.map((l) => l.name) || [],
      createdAt: page.version?.when || new Date().toISOString(),
      updatedAt: page.version?.when || new Date().toISOString(),
      author: page.version?.by?.displayName || 'Unknown',
      space: page.space?.key || '',
    };
  } catch (error) {
    console.error('Error fetching Confluence page:', error);
    return null;
  }
}


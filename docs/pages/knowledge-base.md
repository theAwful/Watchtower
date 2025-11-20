# Knowledge Base (Wiki)

The Knowledge Base page provides access to pentesting documentation, procedures, and reference materials. It integrates with Atlassian Confluence or uses local storage for documentation management.

## Overview

This page displays a searchable knowledge base of security testing documentation, including methodologies, tools, procedures, and best practices. Content can be sourced from Atlassian Confluence API or stored locally in the browser.

## Features

### Page Display

- **Sidebar**: List of all available pages with search functionality
- **Main Content Area**: Displays selected page content with formatted markdown
- **Search**: Filter pages by title, content, category, or tags
- **Categories**: Organize pages by category (General, Infrastructure, Pentesting, Tools, Procedures, References)

### Content Types

Pages can include:
- **Title**: Page title
- **Content**: Markdown-formatted content
- **Category**: Classification of the page
- **Tags**: Searchable tags for categorization
- **Author**: Page author (when using Confluence)
- **Last Updated**: Timestamp of last modification

### Confluence Integration

When Atlassian Confluence API is configured:
- Pages are fetched from Confluence spaces
- Content is converted from Confluence Storage Format to Markdown
- Supports multiple spaces (default: "PENTEST")
- Real-time sync with Confluence
- Read-only mode (editing must be done in Confluence)

#### Confluence API Setup

Set environment variables:
- `VITE_ATLASSIAN_BASE_URL`: Your Confluence base URL
- `VITE_ATLASSIAN_EMAIL`: Your Atlassian account email
- `VITE_ATLASSIAN_API_TOKEN`: API token from Atlassian

### Local Storage Mode

When Confluence API is not configured:
- Uses mock data with sample pentesting documentation
- Pages are stored in browser localStorage
- Full create/edit/delete functionality
- Data persists across browser sessions

### Content Formatting

Pages support Markdown formatting:
- Headers (H1, H2, H3)
- Bold and italic text
- Code blocks and inline code
- Lists (ordered and unordered)
- Links
- Paragraphs

### Search Functionality

- Real-time search as you type
- Searches across:
  - Page titles
  - Page content
  - Categories
  - Tags
- Results update instantly in sidebar

## Usage

### Viewing Pages
1. Navigate to Knowledge Base from main menu
2. Use search bar to find specific pages
3. Click on a page in the sidebar to view content
4. Content displays in the main area with formatted markdown

### Creating Pages (Local Mode Only)
1. Click "New Page" button (only in local storage mode)
2. Enter page title
3. Write content in Markdown format
4. Select category
5. Add tags (comma-separated)
6. Click "Save"

### Editing Pages (Local Mode Only)
1. Select a page from sidebar
2. Click edit icon
3. Modify title, content, category, or tags
4. Click "Save"

### Deleting Pages (Local Mode Only)
1. Select a page from sidebar
2. Click delete icon
3. Confirm deletion in dialog

### Refreshing from Confluence
1. Click refresh icon in header
2. Pages are re-fetched from Confluence API
3. Updates are reflected immediately

## Sample Content

The knowledge base includes sample content covering:
- Penetration Testing Methodology
- OWASP Top 10 Vulnerabilities
- Network Penetration Testing Checklists
- Web Application Testing Guides
- Common Exploitation Techniques
- Active Directory Penetration Testing
- Cloud Security Testing (AWS)
- Report Writing Best Practices

## Troubleshooting

### Pages not loading (Confluence)
1. Verify Confluence API credentials in environment variables
2. Check that Confluence is accessible
3. Verify API token has read permissions
4. Check browser console for API errors

### Content not formatting correctly
1. Ensure content is valid Markdown
2. Check for special characters that might break parsing
3. Verify Confluence Storage Format conversion (if using API)

### Search not working
1. Clear search bar and try again
2. Check that pages are loaded (not empty)
3. Verify search term spelling

### Local storage full
1. Delete unused pages
2. Clear browser localStorage
3. Export important pages before clearing


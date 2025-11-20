# Task Board

The Task Board page provides project and task management functionality, integrating with Trello API or using local storage for task tracking.

## Overview

This page displays a Kanban-style board for tracking internal development projects and tasks. Tasks are organized into lists (columns) representing different stages of work.

## Features

### Board Display

- **Multiple Boards**: Support for multiple project boards
- **Lists (Columns)**: Each board contains lists like "To Do", "In Progress", "Review", "Done"
- **Cards**: Tasks are displayed as cards within lists
- **Card Information**: Each card shows:
  - Title
  - Description (truncated if long)
  - Labels (color-coded tags)
  - Assignees (avatar group)
  - Due dates (with overdue highlighting)
  - Attachment count
  - Checklist count

### Trello Integration

When Trello API is configured:
- Boards, lists, and cards are fetched from Trello
- Full CRUD operations (Create, Read, Update, Delete)
- Real-time sync with Trello
- Supports multiple boards
- Card editing and movement between lists

#### Trello API Setup

Set environment variables:
- `VITE_TRELLO_API_KEY`: Your Trello API key
- `VITE_TRELLO_API_TOKEN`: Your Trello API token
- `VITE_TRELLO_BOARD_ID`: (Optional) Specific board ID to display

### Local Storage Mode

When Trello API is not configured:
- Uses mock data with sample development projects
- Full create/edit/delete functionality
- Data stored in browser localStorage
- Supports multiple boards and lists

### Card Management

#### Creating Cards
1. Click "Add Card" button in any list
2. Enter card name (required)
3. Add description (optional)
4. Set due date (optional)
5. Select target list
6. Click "Create"

#### Editing Cards
1. Click edit icon on a card
2. Modify name, description, or due date
3. Move card to different list (if needed)
4. Click "Save"

#### Deleting Cards
1. Click delete icon on a card
2. Confirm deletion in dialog
3. Card is removed from board

### Card Features

- **Labels**: Color-coded tags for categorization
  - Colors: red, orange, yellow, green, blue, purple, pink, black, sky
- **Members**: Assigned team members (displayed as avatars)
- **Attachments**: File attachment count indicator
- **Checklists**: Task checklist count indicator
- **Due Dates**: 
  - Displayed with calendar icon
  - Overdue dates highlighted in red
  - Formatted as localized date

### Visual Indicators

- **Overdue Tasks**: Cards with past due dates show red date chip
- **Label Colors**: Mapped to Material UI color scheme
- **Status Indicators**: Visual representation of task progress

## Usage

### Viewing Tasks
1. Navigate to Task Board from main menu
2. View all boards and their lists
3. Scroll horizontally to see all lists
4. Click on cards to view details

### Creating a New Task
1. Click "Add Card" in the appropriate list
2. Fill in task details
3. Select target list if different
4. Click "Create"

### Moving Tasks
1. Edit a card
2. Use "Move to List" dropdown
3. Select destination list
4. Save changes

### Tracking Progress
- Move cards between lists as work progresses
- Use labels to categorize tasks
- Set due dates for time-sensitive tasks
- Assign members to tasks

## API Integration

The Task Board uses Trello API endpoints:
- `GET /boards` - Fetch all boards
- `GET /boards/:id/lists` - Get lists for a board
- `GET /boards/:id/cards` - Get cards for a board
- `POST /cards` - Create new card
- `PUT /cards/:id` - Update card
- `PUT /cards/:id` (with idList) - Move card
- `DELETE /cards/:id` - Delete card

## Troubleshooting

### Boards not loading (Trello)
1. Verify Trello API credentials in environment variables
2. Check that API key and token are valid
3. Ensure API token has necessary permissions
4. Check browser console for API errors

### Cards not saving
1. Verify API token has write permissions
2. Check backend logs for API errors
3. Ensure card name is provided (required field)

### Cards not moving
1. Verify target list ID is valid
2. Check API token has card update permissions
3. Refresh board to see updates

### Local storage issues
1. Clear browser localStorage if data is corrupted
2. Export important tasks before clearing
3. Check browser storage quota

## Best Practices

- Use labels consistently for categorization
- Set realistic due dates
- Move cards promptly as work progresses
- Use descriptions for detailed task information
- Assign members to tasks for accountability


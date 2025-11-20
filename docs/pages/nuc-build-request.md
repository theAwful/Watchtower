# NUC Build Request

The NUC Build Request page provides a form for submitting requests to build and configure NUC (Next Unit of Computing) devices for client engagements.

## Overview

This page allows you to submit build requests with all necessary information for provisioning NUC devices, including client details, engagement information, IP configuration, and shipping addresses.

## Form Fields

### Client Information
- **Client Name**: Name of the client organization
- **Engagement Code**: Unique code identifying the engagement

### IP Address Configuration
- **IP Address Type**: Radio button selection
  - **DHCP**: Device will obtain IP address automatically
  - **Static**: Device will use a static IP address
- **Static IP Address**: Required if "Static" is selected

### Client Contact Information
- **Contact Name**: Primary contact person
- **Contact Email**: Email address for the contact
- **Contact Phone**: Phone number for the contact

### Shipping Information
- **Street Address**: Shipping street address
- **City**: Shipping city
- **State/Province**: State or province
- **ZIP/Postal Code**: Postal code
- **Country**: Defaults to "United States"

## Usage

1. Navigate to the NUC Build Request page from the main navigation
2. Fill in all required fields
3. Select IP address configuration (DHCP or Static)
4. If Static is selected, provide the static IP address
5. Enter client contact information
6. Provide complete shipping address
7. Click "Submit Request" button

## Form Validation

- Client Name is required
- Engagement Code is required
- Static IP Address is required if "Static" IP type is selected
- All contact fields are required
- All shipping address fields are required

## Current Status

**Note**: This is currently a frontend-only form for proof of concept. Form submission shows a success message and resets the form, but does not send data to a backend API yet. Backend integration will be implemented in a future update.

## Future Enhancements

- Backend API integration for request submission
- Request history and tracking
- Email notifications
- Integration with build automation systems
- Request status tracking


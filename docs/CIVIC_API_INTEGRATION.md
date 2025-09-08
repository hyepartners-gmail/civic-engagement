# Google Civic API Integration

This document describes the Google Civic Information API integration implemented in the Civic page.

## Overview

The integration provides users with comprehensive civic information including:
- Upcoming elections with detailed information
- Polling locations with coordinates, hours, and services
- Early voting sites with full scheduling details
- Ballot drop-off locations with availability windows
- Complete election contests (candidates and referenda)
- Detailed candidate information including contact details and social media
- Comprehensive referendum information with pro/con arguments
- Election official contact information
- Voter registration and election administration resources
- Absentee/mail-in voting information
- Election notices and special instructions

## API Endpoint

### `/api/civic-info`

**Method:** GET

**Parameters:**
- `address` (required): Full address or ZIP code to query
- `electionId` (optional): Specific election ID to query

**Example:**
```
GET /api/civic-info?address=San Francisco, CA 94102
GET /api/civic-info?address=12345&electionId=2024-11-05
```

## Features

### 1. Automatic Election Detection
- Fetches upcoming elections from Google Civic API
- Automatically selects the next upcoming election if no specific election ID is provided
- Displays election name and date prominently

### 2. Comprehensive Polling Information
- **Polling Locations**: Regular election day voting locations with:
  - Full addresses and GPS coordinates
  - Operating hours and special notes
  - Available voter services
  - Accessibility information
- **Early Voting Sites**: Locations for early voting with:
  - Specific date ranges and hours
  - Services available at each location
  - GPS coordinates for precise navigation
- **Drop-off Locations**: Ballot drop box locations with:
  - 24/7 availability status
  - Security and collection schedules
  - Precise coordinates and directions

### 3. Ballot Contest Organization
Contests are automatically grouped by level:
- **Federal Elections**: President, Congress, Senate
- **State Elections**: Governor, State Legislature, Attorney General
- **Local Elections**: Mayor, City Council, School Board, etc.

For each contest:
- Office name and ballot title
- Number of positions to be elected
- Candidate information including:
  - Name, party affiliation, and ballot order
  - Contact information (phone, email)
  - Campaign website and social media channels
  - Professional photos
- Comprehensive referendum details including:
  - Title, subtitle, and full text
  - Pro and con arguments
  - Passage requirements and voting thresholds
  - Effect of abstaining
  - Available ballot response options

### 4. Election Officials and Administration
- **State Election Administration**: 
  - Voter registration URLs and confirmation links
  - Absentee/mail-in voting information
  - Sample ballot and election rules
  - Polling location finder tools
  - Official election notices and announcements
- **Local Election Offices**:
  - Contact information for election officials
  - Office hours and physical addresses
  - Direct phone numbers and email addresses
  - Fax numbers for official correspondence
- **Voter Services**:
  - Registration status verification
  - Ballot information and candidate guides
  - Voting location assistance
  - Accessibility accommodations

### 5. Caching
- Results are cached for 24 hours per address to reduce API calls
- Cache key includes address and election ID for specificity

## User Interface

### Top Section
- User's location (city, state, ZIP code)
- Congressional district information
- Upcoming election details with formatted date
- Refresh button to update information

### Polling Info Section
Expandable accordion with:
- Polling location details
- Early voting site information
- Ballot drop-off locations
- Hours and special notes

### Ballot Contests Section
Organized by election level with:
- Candidate cards showing photos, names, and party affiliations
- Links to candidate websites
- Referendum summaries with full text

### Officials Section
Contact information for:
- Election administration offices
- Voter registration bodies
- Direct links to official websites

## Error Handling

The API gracefully handles various error conditions:
- Missing or invalid addresses
- No civic information available for the location
- Google API rate limits or temporary outages
- Network connectivity issues

When errors occur, users see appropriate messages and can retry with the refresh functionality.

## Environment Configuration

Required environment variable:
```
GOOGLE_CIVIC_API_KEY=your_google_civic_api_key_here
```

## Technical Implementation

### Data Flow
1. User visits Civic page
2. System constructs full address from user profile (city, state, ZIP)
3. API fetches elections, voter info, and representatives data from Google
4. Data is processed and structured for display
5. Results are cached for future requests
6. UI renders organized civic information

### Key Components
- `pages/api/civic-info.ts`: Server-side API endpoint
- `pages/Civic.tsx`: Main civic page component
- `components/CivicInfoDisplay.tsx`: Information display component
- `components/CivicMap.tsx`: Map visualization (if available)

### Data Processing
- Contests are automatically categorized by government level
- Candidate information is enhanced with photos and links
- Addresses are normalized for consistent display
- Election dates are formatted for readability

## Usage Examples

### Basic Usage
Users with complete profiles (city, state, ZIP) automatically see civic information for their location.

### Manual Refresh
Users can click the "Refresh Info" button to get updated information, useful during election periods when information changes frequently.

### Election-Specific Queries
The system can be extended to allow users to query specific past or future elections by providing an election ID.

## Future Enhancements

Potential improvements include:
- Integration with local election websites
- Candidate comparison tools
- Voting history tracking
- Election reminders and notifications
- Multi-language support for diverse communities
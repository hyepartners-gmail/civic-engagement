# Welcome to your Dyad app

## Environment Variables

The following environment variables are required for the application to function properly:

### Google Civic Information API
```
GOOGLE_CIVIC_API_KEY=your_google_civic_api_key_here
```

This key is required for the Civic Information page (`/civic`) to fetch election data, polling locations, and ballot information from the Google Civic Information API.

To obtain a Google Civic API key:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Civic Information API
4. Create credentials (API key)
5. Add the API key to your `.env` file

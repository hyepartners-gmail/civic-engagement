# Backend Account Management Tasks

This document outlines the necessary backend API routes and considerations for implementing "Forgot Password" functionality and automated user management tasks.

## 1. Forgot Password Process

This process allows users to reset their password if they've forgotten it, without needing to log in.

### API Routes to Implement:

*   **`POST /api/forgot-password`**
    *   **Purpose:** Initiates the password reset process by sending a reset link to the user's email.
    *   **Request Body:**
        ```json
        {
          "email": "user@example.com"
        }
        ```
    *   **Logic:**
        1.  Receive the user's email address.
        2.  Look up the user in Google Cloud Datastore by email.
        3.  If the user exists:
            *   Generate a unique, cryptographically secure, and time-limited token (e.g., UUID).
            *   Store this token and its expiration timestamp (e.g., 1 hour from now) in the user's Datastore entity (e.g., `resetToken`, `resetTokenExpiry`).
            *   Construct a password reset URL containing the token and user ID (e.g., `https://your-app.com/auth?mode=reset-password&token=<token>&userId=<userId>`).
            *   Call the existing `/api/send-email` endpoint to send an email to the user with this reset link.
        4.  **Security Note:** Always return a generic success message to the frontend, regardless of whether the email was found or not. This prevents enumeration attacks (where an attacker can guess valid email addresses).
    *   **Response:**
        ```json
        {
          "message": "If an account with that email exists, a password reset link has been sent."
        }
        ```

*   **`POST /api/reset-password`**
    *   **Purpose:** Allows a user to set a new password using a valid reset token.
    *   **Request Body:**
        ```json
        {
          "userId": "user-id-from-link",
          "token": "token-from-link",
          "newPassword": "newSecurePassword123!"
        }
        ```
    *   **Logic:**
        1.  Receive the `userId`, `token`, and `newPassword`.
        2.  Look up the user in Google Cloud Datastore by `userId`.
        3.  Validate the provided `token` against the `resetToken` stored in the user's entity.
        4.  Check if the `resetTokenExpiry` has passed.
        5.  If the token is valid and not expired:
            *   **Important:** In a real application, securely hash the `newPassword` before storing it (e.g., using bcrypt). For this project, we'll simulate the update.
            *   Update the user's password in Datastore.
            *   Clear the `resetToken` and `resetTokenExpiry` fields from the user's entity to prevent reuse.
        6.  If the token is invalid or expired, return an error.
    *   **Response (Success):**
        ```json
        {
          "message": "Your password has been successfully reset."
        }
        ```
    *   **Response (Error):**
        ```json
        {
          "message": "Invalid or expired reset link."
        }
        ```

### Data Model Updates:

*   **`User` Entity (in Datastore and `src/types/index.ts`):**
    *   `resetToken?: string;` (To store the unique reset token)
    *   `resetTokenExpiry?: string;` (ISO string for token expiration timestamp)

## 2. Automated User Management (Reminders & Deletion)

This involves background tasks that run periodically to manage unverified user accounts.

### API Route to Implement:

*   **`GET /api/cron/clean-unverified-users`**
    *   **Purpose:** Identifies and processes unverified user accounts (sends reminders, deletes old ones).
    *   **Logic:**
        1.  Query Google Cloud Datastore for users where `isVerified` is `false`.
        2.  Iterate through these unverified users:
            *   **Reminder Logic (e.g., after 24h):** If `lastActivityDate` (or `createdAt`) is older than 24 hours but less than 48 hours, and a reminder hasn't been sent recently, call `/api/send-email` to send a reminder. Update a `lastReminderSent` timestamp on the user.
            *   **Deletion Logic (e.g., after 48h):** If `lastActivityDate` (or `createdAt`) is older than 48 hours, delete the user's entity from Datastore.
        3.  Log the actions performed.
    *   **Response:**
        ```json
        {
          "message": "Unverified user cleanup process completed.",
          "remindersSent": 5,
          "usersDeleted": 2
        }
        ```

### External Scheduling Requirement:

*   **Next.js API routes are stateless and respond to HTTP requests.** They do not run automatically in the background.
*   To trigger `GET /api/cron/clean-unverified-users` periodically (e.g., every 24 hours), you would need an **external scheduling service**.
*   **Recommended for Google Cloud Run deployments:** Use **Google Cloud Scheduler**.
    *   Configure a job to send an HTTP GET request to your deployed Next.js API endpoint (`https://your-app-url.com/api/cron/clean-unverified-users`) at your desired interval (e.g., daily).
    *   Ensure proper authentication for this cron job (e.g., using OIDC tokens for Cloud Run services) to prevent unauthorized access.

---

Now, let's proceed with the frontend and backend implementation for the "Forgot Password" flow.

First, I'll update the `User` interface in `src/types/index.ts` to include the new fields for the reset token.

<dyad-write path="src/types/index.ts" description="Adding resetToken and resetTokenExpiry to the User interface.">
export interface Topic {
  id: string;
  title: string;
  preview: string;
  region: 'local' | 'state' | 'national' | 'global';
  problemStatement?: string;
  solutions?: Solution[];
  status?: 'pending' | 'approved' | 'rejected'; // Added for suggested topics
  upvotes?: number; // Added for suggested topics to track community interest
  suggesterId?: string; // New: ID of the user who suggested the topic
  flags?: number; // New: for moderation
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  votes?: number; // New: to track votes per solution
  // flags?: number; // Removed: solutions cannot be flagged
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  partyPreference?: string;
  politicalAlignment?: 'Left' | 'Center' | 'Right'; // New: Broad political alignment
  zipCode?: string; // Changed from address to zipCode
  isVerified: boolean;
  votesCast: number; // Total topic votes (upvotes + skips)
  totalComments: number; // New: Total comments posted by user
  totalSolutionVotes: number; // New: Total solution votes cast by user
  badges?: Badge[]; // New: Array of earned badges
  badgeProgress?: BadgeProgress[]; // New: Progress towards badges
  approvedSuggestions?: number;
  totalUpvotes?: number; // Total upvotes received on comments/solutions
  votedSolutions?: { topicId: string; solutionId: string | null }[]; // New: Track user's specific solution votes
  isMuted?: boolean; // New: for moderation
  lastActivityDate?: string; // New: For streak tracking (ISO string)
  currentStreak?: number; // New: For streak tracking
  resetToken?: string; // New: For password reset
  resetTokenExpiry?: string; // New: For password reset token expiration
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string; // Lucide icon name or path to an image
  criteria?: { // New: Criteria for automatic assignment
    type: 'totalComments' | 'totalVotes' | 'totalSolutionVotes' | 'approvedSuggestions' | 'commentUpvotes' | 'manual' | 'streak';
    threshold?: number;
  };
}

export interface BadgeProgress {
  badgeId: string;
  currentCount: number;
  threshold: number;
}

export interface Comment {
  id: string;
  text: string;
  author: Pick<User, 'id' | 'displayName' | 'badges'>; // Added 'badges' to author
  timestamp: string; // ISO string
  parentId: string | null; // For replies
  upvotes?: number; // New: Upvotes for comments
  adminApproved?: boolean; // New: For moderation queue
  flags?: number; // New: For tracking flagged comments
  status?: 'pending' | 'approved' | 'rejected'; // New: For moderation status of comments
}
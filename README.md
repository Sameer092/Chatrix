# Chatrix

A full-featured social chat application built with React Native, Expo, and Supabase. Chatrix combines real-time messaging, social feeds, group chats, and a friend system into a single polished mobile experience with a dark-first design system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Database Migrations](#database-migrations)
- [Storage Buckets](#storage-buckets)
- [Running the App](#running-the-app)
- [Deployment](#deployment)
- [Design System](#design-system)
- [Architecture Notes](#architecture-notes)

---

## Overview

Chatrix is a production-ready React Native application targeting iOS and Android. It uses Supabase as its backend-as-a-service layer for authentication, database, real-time subscriptions, and file storage. The UI is built with a dark-mode-first approach and ships with full light mode support via a Zustand theme store.

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React Native 0.74 + Expo SDK 51 |
| Language | TypeScript 5.3 |
| Styling | NativeWind v4 + TailwindCSS 3.4 |
| Animations | React Native Reanimated v3 |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |
| State Management | Zustand 4.5 |
| Server State | TanStack Query (React Query) v5 |
| Navigation | React Navigation 6 (Native Stack + Bottom Tabs) |
| Forms | React Hook Form 7 + Zod 3 |
| Media | Expo Image, Expo AV, Expo Image Picker |
| Notifications | Expo Notifications |
| Secure Storage | Expo Secure Store |
| Icons | @expo/vector-icons (Ionicons) |
| Bottom Sheet | @gorhom/bottom-sheet 4 |

---

## Features

### Authentication
- Email and password sign up / sign in
- Forgot password flow with email reset link
- Auto-refresh tokens persisted in Expo Secure Store
- Onboarding screen for new users
- Animated splash screen

### Social Feed
- Infinite-scroll post feed from friends
- Create posts with text and up to multiple images
- Like and unlike posts with optimistic UI updates
- Comment threads with nested replies
- Post detail view

### Real-Time Messaging
- One-to-one direct message conversations
- Real-time message delivery via Supabase Realtime channels
- Read receipts
- Message types: text, image, voice note, file
- Voice note recording and playback
- Typing indicators
- Conversation list sorted by most recent activity

### Group Chat
- Create groups with name, description, and avatar
- Add members during creation or later
- Admin and member roles
- Group message feed with sender avatars
- Group info screen with member list and management

### Friends System
- Send and cancel friend requests
- Accept or reject incoming requests
- Unfriend from the friends list
- Pending request badge on the notifications tab

### User Search
- Full-text search by name or username powered by `pg_trgm` indexes
- Debounced input (400 ms) to minimise query traffic
- Search results link directly to user profiles

### User Profiles
- Public profile view with bio, avatar, and cover photo
- Edit profile: name, username, bio, avatar, cover image
- Private account mode (controls feed and friend visibility)
- Online / last seen status

### Notifications
- In-app notification feed: likes, comments, friend requests, messages, group invites
- Unread badge count in the tab bar
- Mark individual or all notifications as read
- Notification actor avatar with type icon badge

### Settings
- Dark / light mode toggle persisted across sessions
- Sign out with confirmation prompt
- Navigation to Edit Profile, Friends, and Privacy screens
- App version display

---

## Project Structure

```
Chatrix/
├── app.json                        # Expo configuration
├── babel.config.js
├── global.css                      # NativeWind global styles
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── index.ts                        # Entry point
├── App.tsx                         # Root providers setup
│
├── assets/
│   ├── images/
│   └── sounds/
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # All table definitions and indexes
│   │   ├── 002_rls_policies.sql    # Row-level security policies
│   │   └── 003_functions_triggers.sql  # PL/pgSQL functions and triggers
│   ├── functions/                  # Supabase Edge Functions (if any)
│   └── seed.sql                    # Development seed data
│
└── src/
    ├── components/
    │   ├── shared/
    │   │   └── Header.tsx
    │   └── ui/
    │       ├── Avatar.tsx
    │       ├── Badge.tsx
    │       ├── Button.tsx
    │       ├── EmptyState.tsx
    │       ├── GlassmorphicCard.tsx
    │       ├── Input.tsx
    │       ├── LoadingSpinner.tsx
    │       └── Skeleton.tsx
    │
    ├── constants/
    │   ├── colors.ts
    │   ├── config.ts               # App-wide config and Supabase credentials
    │   └── typography.ts
    │
    ├── features/
    │   ├── auth/
    │   │   └── screens/
    │   │       ├── SplashScreen.tsx
    │   │       ├── OnboardingScreen.tsx
    │   │       ├── LoginScreen.tsx
    │   │       ├── RegisterScreen.tsx
    │   │       └── ForgotPasswordScreen.tsx
    │   ├── chat/
    │   │   ├── components/
    │   │   │   ├── ConversationItem.tsx
    │   │   │   ├── MessageBubble.tsx
    │   │   │   ├── MessageInput.tsx
    │   │   │   ├── TypingIndicator.tsx
    │   │   │   └── VoiceRecorder.tsx
    │   │   └── screens/
    │   │       ├── ChatListScreen.tsx
    │   │       └── ChatScreen.tsx
    │   ├── feed/
    │   │   ├── components/
    │   │   │   ├── CreatePostModal.tsx
    │   │   │   └── PostCard.tsx
    │   │   └── screens/
    │   │       └── FeedScreen.tsx
    │   ├── friends/
    │   │   └── screens/
    │   │       └── FriendsScreen.tsx
    │   ├── groups/
    │   │   └── screens/
    │   │       ├── CreateGroupScreen.tsx
    │   │       ├── GroupChatScreen.tsx
    │   │       └── GroupsScreen.tsx
    │   ├── notifications/
    │   │   └── screens/
    │   │       └── NotificationsScreen.tsx
    │   ├── profile/
    │   │   └── screens/
    │   ├── search/
    │   │   └── screens/
    │   │       └── SearchScreen.tsx
    │   └── settings/
    │       └── screens/
    │           └── SettingsScreen.tsx
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useDebounce.ts
    │   ├── useNotifications.ts
    │   ├── useOnlineStatus.ts
    │   └── useTheme.ts
    │
    ├── navigation/
    │   ├── AppNavigator.tsx        # Root navigator (Auth vs Main)
    │   ├── AuthNavigator.tsx       # Stack for auth screens
    │   └── MainNavigator.tsx       # Bottom tabs + root stack
    │
    ├── services/
    │   ├── supabase.ts             # Supabase client singleton
    │   ├── auth.service.ts
    │   ├── chat.service.ts
    │   ├── friend.service.ts
    │   ├── group.service.ts
    │   ├── notification.service.ts
    │   ├── post.service.ts
    │   ├── profile.service.ts
    │   └── storage.service.ts
    │
    ├── store/
    │   ├── authStore.ts            # Zustand: user session + profile
    │   ├── chatStore.ts            # Zustand: active conversation state
    │   ├── notificationStore.ts    # Zustand: unread count + mark read
    │   └── themeStore.ts           # Zustand: dark/light mode toggle
    │
    ├── types/
    │   ├── index.ts
    │   ├── database.types.ts       # All entity interfaces (Profile, Message, etc.)
    │   └── navigation.types.ts     # Typed navigation param lists
    │
    └── utils/
        └── formatters.ts           # Date/time, file size formatters
```

---

## Prerequisites

- Node.js 18 or later
- npm 9+ or Yarn 1.22+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- A [Supabase](https://supabase.com) account (free tier is sufficient for development)
- iOS Simulator (macOS only) or Android Emulator, or a physical device with the Expo Go app

---

## Environment Variables

Create a `.env` file in the project root. Expo reads variables prefixed with `EXPO_PUBLIC_` and makes them available at build time.

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
1. Open your Supabase project dashboard.
2. Go to **Project Settings** > **API**.
3. Copy the **Project URL** and the **anon / public** key.

> Never commit `.env` to version control. It is already listed in `.gitignore`.

---

## Supabase Setup

### 1. Create a Supabase Project

1. Sign in at [supabase.com](https://supabase.com).
2. Click **New Project**.
3. Choose an organisation, name the project `chatrix` (or any name), set a strong database password, and select a region close to your users.
4. Wait for the project to finish provisioning (about 60 seconds).

### 2. Enable Email Auth

1. In your Supabase dashboard go to **Authentication** > **Providers**.
2. Ensure **Email** is enabled.
3. Under **Email** settings, configure the redirect URL to `chatrix://` (matching the `scheme` in `app.json`) for password-reset deep links.

### 3. Configure Storage Buckets

See the [Storage Buckets](#storage-buckets) section below.

### 4. Copy Your Credentials

Add the Project URL and anon key to your `.env` file as shown above.

---

## Database Migrations

All migrations live in `supabase/migrations/`. Run them in order against your Supabase project using the SQL editor or the Supabase CLI.

### Option A — Supabase Dashboard SQL Editor (quickest)

1. In your project dashboard click **SQL Editor** > **New query**.
2. Paste and run the contents of each migration file in order:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_functions_triggers.sql`
3. Optionally run `seed.sql` for minimal development data.

### Option B — Supabase CLI

```bash
# Install the CLI
npm install -g supabase

# Log in
supabase login

# Link to your remote project (find the project ref in Project Settings > General)
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### What the Migrations Create

**`001_initial_schema.sql`**
- Enables `uuid-ossp` and `pg_trgm` extensions
- Creates tables: `profiles`, `posts`, `post_likes`, `comments`, `friendships`, `friend_requests`, `conversations`, `conversation_members`, `messages`, `message_reads`, `groups`, `group_members`, `group_messages`, `notifications`, `uploaded_files`
- Adds GIN indexes on `profiles.username` and `profiles.name` for full-text search
- Adds performance indexes on foreign keys and sort columns

**`002_rls_policies.sql`**
- Enables Row Level Security on every table
- Profiles: public read unless private, own-user write
- Messages and conversations: members-only access
- Notifications: user-scoped read and write
- Friend requests: sender and receiver access

**`003_functions_triggers.sql`**
- `handle_new_user` trigger — auto-creates a `profiles` row when a new auth user is registered, pulling name and username from `raw_user_meta_data`
- `update_updated_at` trigger — maintains `updated_at` timestamps on profiles, posts, groups, and conversations
- `update_post_like_count` trigger — keeps `posts.likes_count` in sync with `post_likes` inserts and deletes
- `update_comment_count` trigger — keeps `posts.comments_count` in sync
- Online status helper functions

---

## Storage Buckets

Create the following buckets in **Storage** > **New bucket** in your Supabase dashboard. Set them all to **Public** so the app can display images without generating signed URLs each time.

| Bucket Name | Purpose | Max Size |
|---|---|---|
| `avatars` | User profile pictures | 5 MB |
| `covers` | User cover / banner images | 10 MB |
| `posts` | Images attached to posts | 50 MB |
| `messages` | Images and files sent in chats | 100 MB |
| `groups` | Group avatar images | 5 MB |

After creating each bucket, add a storage policy that allows authenticated users to upload files and allows public read access.

**Example policy for `avatars` (insert for authenticated, select for all):**

```sql
-- Allow authenticated users to upload
CREATE POLICY "Avatar upload for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public read
CREATE POLICY "Avatar public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

Repeat the same pattern for each bucket, substituting the `bucket_id`.

---

## Running the App

### 1. Install Dependencies

```bash
cd /path/to/Chatrix
npm install
```

### 2. Start the Expo Dev Server

```bash
# Start with Expo Go (quickest — no native build required)
npm start

# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android
```

### 3. Open on a Physical Device

Install [Expo Go](https://expo.dev/client) on your iOS or Android device, scan the QR code printed in the terminal, and the app will load over your local network.

### 4. TypeScript Check

```bash
npm run typecheck
```

---

## Deployment

### Building with EAS (Expo Application Services)

EAS Build creates native `.ipa` (iOS) and `.apk` / `.aab` (Android) binaries without requiring Xcode or Android Studio locally.

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in
eas login

# Configure the project (creates eas.json)
eas build:configure

# Build for both platforms
eas build --platform all

# Build for iOS only
eas build --platform ios

# Build for Android only
eas build --platform android
```

### App Store / Google Play Submission

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

### Over-the-Air Updates

EAS Update allows you to push JavaScript-only updates instantly without going through app store review.

```bash
eas update --branch production --message "Fix notification badge count"
```

### Supabase Production Checklist

Before going live:

- [ ] Rotate the database password from the dashboard default
- [ ] Enable **PITR (Point-in-Time Recovery)** on the Pro plan
- [ ] Review all RLS policies with the **Policy Advisor** in the dashboard
- [ ] Set up **Supabase Edge Functions** for any server-side business logic that should not run on device
- [ ] Configure **custom SMTP** for transactional emails (password reset, etc.)
- [ ] Enable **Realtime** restrictions — limit the tables exposed via the Realtime API to only `messages`, `group_messages`, `notifications`, and `profiles`
- [ ] Add your production app's bundle identifier to the **Allowed Origins** in Authentication settings

---

## Design System

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| Background | `#0F0F23` | `#F8F9FA` | Screen backgrounds |
| Card | `#1A1A3E` | `#FFFFFF` | Cards, sheets, modals |
| Primary | `#6C63FF` | `#6C63FF` | Buttons, links, active states |
| Text | `#FFFFFF` | `#1E293B` | Primary text |
| Subtext | `#94A3B8` | `#64748B` | Secondary text, placeholders |
| Border | `#2D2D6B` | `#E2E8F0` | Dividers, input borders |
| Success | `#22C55E` | `#22C55E` | Accept, online indicator |
| Danger | `#EF4444` | `#EF4444` | Delete, reject actions |
| Accent Cyan | `#00D4FF` | `#00D4FF` | Message notifications |
| Accent Amber | `#F59E0B` | `#F59E0B` | Group invites |

### Typography Scale

| Style | Size | Weight | Usage |
|---|---|---|---|
| Screen title | 28 px | 800 | Feed, Notifications |
| Section title | 22 px | 800 | Friends |
| Card heading | 18 px | 700 | Profile name |
| Body | 15–16 px | 400–700 | List items, messages |
| Caption | 11–13 px | 400–700 | Timestamps, usernames |

---

## Architecture Notes

### Data Fetching

All remote data is fetched via TanStack Query. Each service function maps to a query key following the pattern `[resource, id?]` (e.g. `['notifications', userId]`). Mutations call `queryClient.invalidateQueries` on success to keep the UI in sync without manual cache surgery.

### Real-Time Subscriptions

Supabase Realtime channels are subscribed to inside `useEffect` hooks in chat screens and in the `useNotifications` hook. Channels are cleaned up on component unmount to prevent memory leaks. The Supabase client is configured with a rate limit of 10 events per second.

### Auth Flow

`AppNavigator` reads from `authStore`. On mount it calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`. The navigator switches between the auth stack and the main tab stack reactively. Session tokens are stored in Expo Secure Store (encrypted on-device storage), not AsyncStorage.

### Optimistic Updates

Post like/unlike actions use TanStack Query's `onMutate` / `onError` / `onSettled` pattern to update the feed immediately and roll back on failure, keeping the UI snappy even on slow connections.

### Debouncing

Search input is debounced at 400 ms via the `useDebounce` hook before the query is enabled, preventing a network request on every keystroke.

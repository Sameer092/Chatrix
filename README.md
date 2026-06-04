# 💬 Chatrix

![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.76.9-61DAFB?logo=react&logoColor=black)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)

> A full-featured social chat application built with React Native, Expo, and Supabase.
> Chatrix combines real-time messaging, social feeds, group chats, and a friend system
> into a single polished mobile experience with a dark-first design system.

---

## 📖 Overview

Chatrix is a production-ready React Native app targeting iOS and Android. It uses Supabase as its backend-as-a-service layer for authentication, database, real-time subscriptions, and file storage. The UI is dark-mode-first and ships with full light mode support via a Zustand theme store.

---

## ✨ Features

- **Authentication** — email/password sign up & sign in, forgot-password flow, secure token persistence, animated splash & onboarding
- **Social Feed** — infinite-scroll posts, multi-image uploads, optimistic likes, nested comment threads
- **Real-Time Messaging** — 1:1 DMs over Supabase Realtime, read receipts, typing indicators, text/image/voice/file messages
- **Group Chat** — create groups, member roles, group info & management
- **Friends System** — send/accept/reject requests, unfriend, pending badges
- **User Search** — `pg_trgm` full-text search by name/username, 400 ms debounce
- **Profiles** — bio, avatar, cover, private mode, online/last-seen status
- **Notifications** — in-app feed with unread badges, mark read
- **Settings** — dark/light toggle persisted across sessions

---

## 🧱 Tech Stack

| Category | Technology |
|---|---|
| Framework | React Native 0.76.9 + Expo SDK 52 |
| Language | TypeScript 5.x |
| Styling | NativeWind v4 + TailwindCSS 3.4 |
| Animations | React Native Reanimated v3 |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |
| State | Zustand 4 |
| Server State | TanStack Query (React Query) v5 |
| Navigation | React Navigation 6 (Native Stack + Bottom Tabs) |
| Forms | React Hook Form 7 + Zod 3 |
| Media | Expo Image, Expo AV, Expo Image Picker |
| Notifications | Expo Notifications |

---

## 🗂 Project Structure

```
Chatrix/
├── app.json                # Expo configuration
├── index.ts / App.tsx      # Entry point & root providers
├── global.css              # NativeWind global styles
├── supabase/
│   ├── migrations/         # 001 schema · 002 RLS · 003 functions/triggers
│   └── seed.sql            # Development seed data
└── src/
    ├── components/         # shared/ + ui/ (Button, Avatar, Input, Skeleton…)
    ├── constants/          # colors, config, typography
    ├── features/           # auth, chat, feed, friends, groups, notifications, profile, search, settings
    ├── hooks/              # useAuth, useDebounce, useNotifications, useTheme…
    ├── navigation/         # App / Auth / Main navigators
    ├── services/           # supabase client + auth/chat/friend/group/post/profile/storage
    ├── store/              # Zustand stores (auth, chat, notifications, theme)
    ├── types/              # entity + navigation types
    └── utils/              # formatters
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier is fine)
- iOS Simulator / Android Emulator, or the Expo Go app on a device

### Installation & Run
```bash
cd Chatrix
npm install
npx expo start
```
Press `i` for iOS, `a` for Android, or scan the QR code with Expo Go. Run `npm run typecheck` for a TypeScript pass.

---

## ⚙️ Environment Variables

Create a `.env` in the project root (Expo inlines `EXPO_PUBLIC_*` at build time):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```
Find these in **Supabase → Project Settings → API**. Never commit `.env` (already gitignored).

---

## 🗄 Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication → Providers** → enable **Email**; set the reset redirect to `chatrix://`.
3. Run migrations in order (SQL Editor or `supabase db push`): `001_initial_schema.sql` → `002_rls_policies.sql` → `003_functions_triggers.sql`, then optional `seed.sql`.
4. Create **public** storage buckets: `avatars` (5 MB), `covers` (10 MB), `posts` (50 MB), `messages` (100 MB), `groups` (5 MB), each with an authenticated-insert + public-read policy.

---

## 📦 Deployment

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all          # or ios / android
eas submit --platform ios         # store submission
eas update --branch production    # OTA JS-only updates
```

**Production checklist:** rotate the DB password, enable PITR, review RLS with the Policy Advisor, restrict Realtime to needed tables, configure custom SMTP, add the production bundle ID to allowed origins.

---

## 📄 License

MIT — for portfolio/demo use.

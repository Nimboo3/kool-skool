# 📚 School Management Mobile App

A multi-tenant SaaS school management system built with **Expo + Supabase**, designed to connect teachers, parents, and administrators through a mobile-first experience focused on grades, communication, and administration.

---

## 🚀 Tech Stack

- **Mobile**: React Native + Expo (Managed Workflow)
- **Backend**: Supabase (Postgres + Auth + RLS + Storage + Realtime + Edge Functions)
- **Routing**: Expo Router (File-based)
- **Styling**: Tailwind CSS (NativeWind)
- **Forms**: React Hook Form + Zod
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Media**: Supabase Storage / Cloudinary (Free Tier)
- **Language**: TypeScript (Strict Mode)

---

## 🧩 Core Features

### 👩‍🏫 Teachers
- Grade entry and class roster management
- Messaging and announcements
- Assignment tracking

### 👨‍👩‍👧 Parents
- View grades and assignments
- Receive messages and announcements
- Multi-child support

### 🏫 School Admins
- Manage teacher accounts and permissions
- School-wide communication
- Branding and configuration

---

## 🔐 Multi-Tenancy & Security

- Supabase Postgres with `tenant_id` field
- Row-Level Security (RLS) on every table
- Supabase Auth with `tenant_id` in JWT claims
- Automatic query filtering by tenant

---

## 📦 Setup

```bash
npm install
npx expo start
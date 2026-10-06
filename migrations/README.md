# 🗄️ Supabase Migration & Database Setup

This folder contains all SQL migrations, schema definitions, seed configurations, and automated upload scripts for your Supabase project.

---

## 🔑 Your Supabase Project Credentials

* **Project Dashboard**: [https://supabase.com/dashboard/project/ksikkbvxtnpwnisvckeg](https://supabase.com/dashboard/project/ksikkbvxtnpwnisvckeg)
* **API URL / REST Base**: `https://ksikkbvxtnpwnisvckeg.supabase.co`
* **Anon Public Key**:
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaWtrYnZ4dG5wd25pc3Zja2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODM1OTAsImV4cCI6MjEwNjg1OTU5MH0.32_0NMzFN_5_-J9qo7rvVuscpa2wU7zxubMIMQgepsw
  ```

---

## 📂 Files in this Migration Folder

| File | Purpose | How to Run |
| :--- | :--- | :--- |
| [`01_schema.sql`](file:///d:/DEBBUGING-main/migrations/01_schema.sql) | Creates `settings`, `questions`, and `users` tables, performance indexes, and auto `updated_at` triggers. | Paste & Run in **Supabase SQL Editor** |
| [`02_realtime_and_security.sql`](file:///d:/DEBBUGING-main/migrations/02_realtime_and_security.sql) | Enables Postgres Realtime replication channels and configures Row Level Security (RLS) policies. | Paste & Run in **Supabase SQL Editor** |
| [`03_seed_settings.sql`](file:///d:/DEBBUGING-main/migrations/03_seed_settings.sql) | Inserts default event timer status, college branding, compiler keys, and language defaults. | Paste & Run in **Supabase SQL Editor** |
| [`04_rpc_functions.sql`](file:///d:/DEBBUGING-main/migrations/04_rpc_functions.sql) | Stored procedures for concurrency-safe tab switch penalty and event score reset. | Paste & Run in **Supabase SQL Editor** |
| [`upload_questions_to_supabase.js`](file:///d:/DEBBUGING-main/migrations/upload_questions_to_supabase.js) | Node.js script to automatically upload all authentic C++ questions from JSON into Supabase. | `node migrations/upload_questions_to_supabase.js` |

---

## ⚡ Step-by-Step Setup Guide

### Step 1: Open Supabase SQL Editor
1. Go to your project SQL Editor: [https://supabase.com/dashboard/project/ksikkbvxtnpwnisvckeg/sql/new](https://supabase.com/dashboard/project/ksikkbvxtnpwnisvckeg/sql/new)

### Step 2: Execute SQL Files in Order
1. Copy the contents of [`01_schema.sql`](file:///d:/DEBBUGING-main/migrations/01_schema.sql) and click **Run**.
2. Copy the contents of [`02_realtime_and_security.sql`](file:///d:/DEBBUGING-main/migrations/02_realtime_and_security.sql) and click **Run**.
3. Copy the contents of [`03_seed_settings.sql`](file:///d:/DEBBUGING-main/migrations/03_seed_settings.sql) and click **Run**.
4. Copy the contents of [`04_rpc_functions.sql`](file:///d:/DEBBUGING-main/migrations/04_rpc_functions.sql) and click **Run**.

### Step 3: Seed the Questions Bank
Run the node script from your terminal:
```bash
node migrations/upload_questions_to_supabase.js
```
This will insert all questions with expected outputs, bug descriptions, and error line indices into your Supabase `questions` table.

---

## 🎯 Verification
After running the steps above, check your **Table Editor** in Supabase:
- `settings`: 4 rows (`event`, `branding`, `language`, `onlinecompiler`)
- `questions`: 90+ C++ mission records
- `users`: Ready to receive student registrations and live submissions

# BSc (Hons) CIS / IS – GPA Calculator & Academic Planner

A modern, high-performance web application designed for students to track modules, compute real-time cumulative weighted GPA (FGPA), forecast target degree classes, and manage academic progress.

Built with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Firebase Auth (Microsoft SSO)**, and **Cloud Firestore**.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Academic Regulations & Grading System](#academic-regulations--grading-system)
  - [Grade Point Scale](#grade-point-scale)
  - [Year Weighting Scheme](#year-weighting-scheme)
  - [Degree Classification Thresholds](#degree-classification-thresholds)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [Authentication & Security](#authentication--security)
  - [Microsoft Student Single Sign-On](#microsoft-student-single-sign-on)
  - [Firestore Security Rules](#firestore-security-rules)
- [Database Seeding (Excel to Firestore)](#database-seeding-excel-to-firestore)
- [Available Scripts](#available-scripts)
- [Design System](#design-system)
- [Disclaimer](#disclaimer)

---

## Overview

The GPA Calculator is tailored to the four-year **B.Sc. (Hons) CIS / IS** curriculum. It provides an intuitive, high-craft 2026 dashboard interface (inspired by modern developer tools like Linear, Vercel, and Stripe) allowing students to:

1. View preloaded academic results synchronized from department records.
2. Calculate and simulate semester GPAs, year GPAs, and final cumulative GPA (FGPA).
3. Use the **Target Degree Class Forecaster** to calculate the required average GPA needed across remaining credits to secure a First Class or Second Upper.
4. Export grades as JSON or generate a print-ready academic transcript.

---

## Key Features

### 📊 Real-Time Academic Analytics
- **Hero Cumulative GPA (FGPA)**: Prominently displayed with degree class badge and 4-tier interactive progress meter with class threshold ticks (2.00, 2.70, 3.30, 3.70).
- **Yearly Performance Breakdown**: Compact visual table displaying individual GPAs, earned credits, and weighted contribution for each of the 4 academic years.
- **Credit Progress Tracker**: Shows completed credits against the required 120+ credit degree requirement.

### 🎯 Target Degree Forecaster
- Dynamic forecasting calculator: Select a target classification (**First Class 3.70+**, **Second Upper 3.30+**, **Second Lower 2.70+**, or **Pass 2.00+**).
- Computes the exact average GPA required across all remaining ungraded credits.
- Instant feasibility status badge:
  - **Achievable**: Target within realistic reach.
  - **Challenging**: Requires high average performance (> 3.50).
  - **Out of Range**: Target mathematically impossible based on completed credits.
- Dual-tone progress meter and special credit handling (e.g., 8-credit Year 4 Research Project `CIS 42800`).

### ⚡ Smooth Grade Editing & Custom Selectors
- **Custom Grade Dropdown**: Fast, accessible keyboard and mouse dropdown displaying clean grade letters (A+, A, B, etc.) with semantic color-coded badge tints.
- **Viewport Flip Detection**: Dropdowns intelligently flip orientation if clicked near the viewport edge.
- **Auto-Save Engine**: Debounced cloud auto-save (1,000 ms delay) persists grade changes to Cloud Firestore with non-intrusive status toast indicators.

### 📑 Print-Ready Academic Transcript
- Printable academic transcript view rendering all semesters, course codes, titles, credits, and earned grades.
- Built-in `@media print` styling: Hides UI chrome, optimizes typography and borders for clean A4 printing or PDF export.

### 🌓 Seamless Dual Theme
- System-aware **Dark** (`#0B0B0F`) and **Light** (`#FAFAFA`) modes.
- Toggleable directly from the top navigation bar or the login screen.
- Persisted to local storage with inline `<head>` script to prevent flash-of-unstyled-theme (FOUC).

---

## Academic Regulations & Grading System

### Grade Point Scale

| Grade | Grade Point (GP) | Description |
| :---: | :---: | :--- |
| **A+** | 4.00 | Excellent |
| **A**  | 4.00 | Excellent |
| **A-** | 3.70 | Very Good |
| **B+** | 3.30 | Good |
| **B**  | 3.00 | Good |
| **B-** | 2.70 | Satisfactory |
| **C+** | 2.30 | Satisfactory |
| **C**  | 2.00 | Pass |
| **C-** | 1.70 | Conditional Pass |
| **D+** | 1.30 | Bare Pass |
| **D**  | 1.00 | Bare Pass |
| **E**  | 0.00 | Fail |

### Year Weighting Scheme

The Final Grade Point Average (FGPA) applies progressive weighting across the four academic years:

$$\text{FGPA} = (0.20 \times \text{Y1 GPA}) + (0.20 \times \text{Y2 GPA}) + (0.30 \times \text{Y3 GPA}) + (0.30 \times \text{Y4 GPA})$$

- **Year 1**: 20%
- **Year 2**: 20%
- **Year 3**: 30%
- **Year 4**: 30%

### Degree Classification Thresholds

- **First Class Honours**: $\text{FGPA} \ge 3.70$
- **Second Class (Upper Division)**: $3.30 \le \text{FGPA} < 3.70$
- **Second Class (Lower Division)**: $2.70 \le \text{FGPA} < 3.30$
- **General Pass**: $2.00 \le \text{FGPA} < 2.70$
- **Fail / Incomplete**: $\text{FGPA} < 2.00$

---

## Tech Stack & Architecture

- **Frontend Framework**: Next.js 15.1 (React 19, TypeScript)
- **Styling**: Tailwind CSS v4 with custom design tokens (`@theme`) and Inter font
- **Icons**: Lucide React
- **Notifications**: Custom toast system
- **Authentication**: Firebase Authentication with Microsoft OAuth Provider (Azure Entra ID)
- **Database**: Google Cloud Firestore (Client SDK & Firebase Admin SDK)
- **Data Ingestion**: `xlsx` and `tsx` script for parsing academic Excel spreadsheets into Firestore

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 15 Client                    │
│  (React 19 · Tailwind v4 · Lucide · Client Firestore)  │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│       Firebase Auth       │   │     Next.js API Routes    │
│  (Microsoft Entra ID SSO) │   │ (/api/student/me, grades) │
└─────────────┬─────────────┘   └─────────────┬─────────────┘
              │                               │
              ▼                               ▼
┌───────────────────────────────────────────────────────────┐
│                   Google Cloud Firestore                  │
│       - Collection: /students/{REG_NO} (Grades & Meta)    │
│       - Security: Firestore Rules (Document Ownership)    │
└───────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
├── app/
│   ├── api/
│   │   └── student/
│   │       ├── grades/route.ts      # Server-side student grades API
│   │       └── me/route.ts          # Authenticated student profile endpoint
│   ├── globals.css                  # Tailwind v4 tokens, themes & print styles
│   ├── layout.tsx                   # Root layout with Inter font & theme script
│   └── page.tsx                     # Main dashboard page & auth gate
├── components/
│   ├── AuthProvider.tsx             # Context provider for Firebase auth state
│   ├── GradeDropdown.tsx            # Custom accessible grade selector
│   ├── LoginPage.tsx                # 2026-designed student login interface
│   ├── ModuleList.tsx               # Mobile-optimized module list view
│   ├── ModuleTable.tsx              # Desktop tabular module view
│   ├── SummaryCard.tsx              # Cumulative GPA hero card & progress bar
│   ├── TargetPlanner.tsx            # Degree class target forecaster
│   ├── Toast.tsx                    # Toast notification context & alerts
│   ├── TopBar.tsx                   # Sticky minimalist navbar & user menu
│   ├── TranscriptView.tsx           # Printable academic transcript modal
│   └── YearTabs.tsx                 # Segmented year selector tabs
├── data/
│   └── courseData.ts                # Curriculum course catalog, credits & formulas
├── lib/
│   ├── api-client.ts                # Client API wrappers for grade fetching/saving
│   ├── auth.ts                      # Microsoft OAuth authentication helpers
│   ├── firebase.ts                  # Client Firebase SDK initialization
│   ├── firebase-admin.ts            # Server-side Firebase Admin SDK initialization
│   ├── firestore.ts                 # Firestore query operations
│   └── gradeStyles.ts               # Semantic color utility tokens for grades
├── scripts/
│   └── seed-firestore.ts            # Excel spreadsheet ingestion script
├── types/
│   └── index.ts                     # TypeScript interfaces and types
├── firestore.rules                  # Firestore security rules definition
├── middleware.ts                    # Edge route protection middleware
└── package.json                     # Dependencies and project scripts
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.18.0` or later
- **npm**: `v9.0.0` or later
- A Firebase project with **Authentication** and **Firestore Database** enabled.
- *(Optional)* An Azure Portal App Registration for Microsoft SSO.

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd "GPA CAlc"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# ── Firebase Client SDK Config (Public) ───────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# ── Microsoft Azure Entra ID (Optional) ───────────────────────
NEXT_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id_guid

# ── Firebase Admin SDK (Server Only - Secret) ─────────────────
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```

### Running Locally

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Authentication & Security

### Microsoft Student Single Sign-On

- Authentication is handled via **Firebase Auth** using Microsoft OAuth 2.0 (`microsoft.com` provider).
- **Domain Gate**: The app validates that the user's email ends with `@ms.sab.ac.lk`. Non-student accounts are signed out immediately.
- **Index Extraction**: The student index number (registration number) is automatically derived from the email prefix (e.g., `22cis0333@ms.sab.ac.lk` $\rightarrow$ `22CIS0333`).

### Firestore Security Rules

Production-grade rules in `firestore.rules` ensure database isolation:
- All queries require an authenticated session.
- Students can **only** read and update their own document matching their registration number (`/students/{regNo}`).
- Write operations enforce schema validation (only valid grades `A+` through `E` can be saved).
- Document deletion is prevented.

To deploy the rules:
```bash
firebase deploy --only firestore:rules
```

---

## Database Seeding (Excel to Firestore)

To seed student results from the department's Excel file (`Results Semester I,II-Department_of_CIS.xlsx`):

1. Ensure `.env.local` contains the `FIREBASE_ADMIN_*` credentials (or place `scripts/serviceAccountKey.json`).
2. Run the seed command:
   ```bash
   npm run seed
   ```

The script parses student registration numbers, matches them with curriculum course codes, and writes the initial grades to `/students/{regNo}` in Firestore.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server at `localhost:3000` |
| `npm run build` | Compiles an optimized production build |
| `npm run start` | Runs the compiled production server |
| `npm run seed` | Seeds Firestore student records from the Excel spreadsheet |

---

## Design System

The app follows a modern 2026 design philosophy prioritizing restraint, legibility, and high performance:

- **Typography**: `Inter` font with tabular figures (`tabular-nums`) for jitter-free GPA updates.
- **Colors**:
  - **Dark Surface**: `#0B0B0F` background, `#121217` card surface, `#26262E` subtle borders.
  - **Light Surface**: `#FAFAFA` background, `#FFFFFF` card surface, `#E4E4E7` borders.
  - **Accent**: Indigo (`#818CF8` in dark, `#4F46E5` in light).
  - **Semantics**: Emerald (A / First Class), Blue (B / Second Upper), Amber (C / Second Lower), Red/Rose (D/E / Fail).
- **Accessibility**: Visible keyboard focus rings (`:focus-visible`), touch targets $\ge 44\text{px}$ on mobile, and reduced-motion support.

---

## Disclaimer

This is a personal student project developed to help students calculate, track, and forecast academic performance. It is not an official university administration website. Official grades, final transcripts, and degree awards are issued exclusively by the university's Examination Branch.

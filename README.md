# Riznex Digital Solutions - Restaurant Management System

A premium, multi-tenant SaaS web application built specifically to manage, track, and audit restaurant networks. This platform centralizes data from multiple restaurant franchises (e.g., Hungry Birds, Henley on Thames) while strictly enforcing custom financial logic, data isolation, and role-based security.

## 🚀 Technology Stack

This system is built as a modern, full-stack web application using enterprise-grade technologies:

*   **Frontend Framework:** Next.js 15 (App Router) & React
*   **Styling & UI:** Tailwind CSS (Custom dark-mode, premium gold gradients, responsive design)
*   **Backend Server:** Node.js / Next.js Server Actions & API Routes
*   **Database ORM:** Prisma (Strictly typed database schema and migrations)
*   **Database:** SQLite / PostgreSQL (Relational database architecture)
*   **Authentication:** NextAuth.js (Secure session management and role validation)
*   **Language:** TypeScript (End-to-end type safety)

## ✨ Core Features

### 1. Multi-Tenant Architecture
*   **Network Overview:** A centralized Admin Hub (`/admin`) that displays all restaurant clients in a sleek, ultra-compact, premium interface.
*   **Isolated Environments:** Each restaurant operates in a completely walled-off environment. Math, VAT calculations, and UI layouts can be fully customized per client without interfering with others.
*   **Live Data Syncing:** The Admin dashboard automatically scans the entire database in real-time to display the exact date (`DD - MMM - YYYY`) of the most recently uploaded records for Deliveroo, Just Eat, Uber Eats, POS, and Auto Expenses.

### 2. Role-Based Access Control (RBAC)
*   **Administrator Role (Riznex):** Has absolute control. Can view all clients, navigate into any restaurant's specific database, and has full read/write/upload permissions for Sales, Expenses, Wages, and Suppliers.
*   **Client Role:** Highly restricted access. Clients log directly into their specific restaurant dashboard and are trapped in a 100% read-only "Overview" mode. They physically cannot access data-entry pages or view other restaurants.

### 3. Advanced Financial Logic
*   **Custom VAT & Commissions:** The backend logic dynamically adjusts formulas depending on the active restaurant. For example, Hungry Birds might have unique delivery commission rates that differ entirely from Henley on Thames.
*   **Comprehensive Categorization:** Expenses are meticulously categorized (e.g., separating "Auto Expenses" like Utilities and Rent from standard operational costs).
*   **Platform Breakdown:** Sales are split precisely by origin (Uber Eats, Just Eat, Deliveroo, Walk-in Cash, Walk-in Card, Custom POS).

## 📂 Project Structure

```text
restaurant-dashboard/
├── app/
│   ├── admin/                 # Admin Command Center & Client Portfolio UI
│   ├── api/                   # Backend API Routes (Data fetching, client routing)
│   ├── dashboard/             # Core Restaurant interface (Sales, Expenses, Wages)
│   │   ├── expenses/          # Expense tracking logic and UI
│   │   ├── sales/             # Sales tracking logic and UI
│   │   └── layout.tsx         # Dashboard navigation and security locks
│   ├── login/                 # NextAuth secure authentication portal
│   └── layout.tsx             # Global application layout and font injection
├── prisma/
│   └── schema.prisma          # Database models (User, Client, Sale, Expense, Supplier)
├── public/                    # Static assets (Riznex branding, Restaurant logos)
└── middleware.ts              # Global security rules and route protection
```

## 🔒 Security & Data Integrity
*   **Route Protection:** Next.js Middleware intercepts all traffic to ensure unauthenticated users cannot view sensitive data.
*   **Timezone Safety:** Backend queries are strictly formatted using UTC to ensure data uploaded in one timezone does not accidentally bleed into the wrong day on the frontend.
*   **No Unapproved Mutations:** The architecture strictly guards locked production systems (like Hungry Birds) from accidental overwrites. 

## 🎨 UI/UX Design Philosophy
The interface was custom-engineered to reflect a high-end, professional enterprise platform. It features deep dark-mode backgrounds (`#0a0c14`), ultra-clean sans-serif typography, compact data grids designed for laptop screens, and custom golden metallic gradients for the Riznex brand identity.

# Laudato Si' — Campus Growth Initiative

A gamified sustainability platform built for **University of Makati (UMak)** that transforms environmental action into tangible, observable growth. Users make eco-pledges, track their carbon footprint, earn points, and redeem rewards — all while watching a shared 3D plant grow in real time with campus-wide contributions.

## Features

### Pledge Album System
Submit environmental pledges with photo proof. Pledges progress through **draft → submitted → reviewing → graded** stages with admin oversight. Maintain daily streaks for escalating point rewards.

### Carbon Footprint Calculator
An 8-question quiz that estimates your monthly CO₂ emissions across five categories: transportation, food, energy, waste, and water usage.

### Eco-Paths
Choose a sustainability focus area based on your calculator results and track your improvement over time with visual progress indicators.

### Rewards Marketplace
Redeem earned points for food, merchandise, vouchers, experiences, and digital items. Staff verify physical reward pickups via QR code scanning.

### Interactive 3D Plant
A procedurally generated tree that evolves through four growth stages (seed → sprout → plant → tree) based on total campus contributions. Features seasonal effects, time-aware lighting, and weather particles.

### Leaderboards
Rankings by points, donations, and streaks across daily, weekly, monthly, and all-time periods.

### Wallet & Donations
Donate earned points to environmental causes or contribute via GCash. Canteen admins manage wallet balances and payouts.

### Role-Based Admin Dashboard
Four admin roles with granular permissions:
- **Super Admin** — Full system access, audit logs, user management, payouts
- **Finance Admin** — GCash verification, donation management
- **SA Admin** (Student Affairs) — User management, promo codes, pledge grading
- **Canteen Admin** — Reward verification, wallet management

### QR Code System
Campus-wide QR codes for quick platform access and secure reward redemption verification.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14, React 18 |
| 3D Visualization | React Three Fiber, Three.js, GSAP |
| Styling | Tailwind CSS, Framer Motion, Radix UI |
| Authentication | NextAuth.js (Google OAuth) |
| Database | Supabase (PostgreSQL + Realtime WebSockets) |
| Payments | Stripe, GCash integration |
| Other | QR code generation/scanning, React Hook Form, Embla Carousel |

## Authentication

| User Type | Access |
|---|---|
| **UMak users** (`@umak.edu.ph`) | Full access — points, streaks, pledges, rewards, leaderboards |
| **Guest users** | Single pledge allowed, donations only (no points or streaks) |
| **Admin accounts** | Role-based dashboard access |

## Database Schema

### Core Tables

| Table | Purpose |
|---|---|
| `users` | Profiles, points, wallet balance, role, verification & ban status |
| `streaks` | Daily streak tracking (current, longest, last pledge date) |
| `contributions` | Pledge submissions with timestamps and points awarded |
| `pledge_albums` | Pledge artifacts with status (draft/submitted/reviewing/graded) |
| `pledge_proofs` | Uploaded file proofs for pledges |
| `rewards` | Available rewards with point costs and stock tracking |
| `reward_redemptions` | Redemption requests with QR codes and verification |
| `point_transactions` | Audit trail of all point movements |
| `donations` | Point and GCash donations to campaigns |
| `promo_codes` | Marketing codes that grant points or rewards |
| `carbon_footprint_results` | Calculator quiz results per user |
| `user_eco_paths` | User's selected eco-path focus area |
| `audit_logs` | Admin action logging for compliance |
| `wallet_transactions` | Canteen admin wallet movements |
| `wallet_payouts` | GCash payout tracking |

### Data Flow

```
User submits pledge → API validates auth & rate limit → DB write → Supabase broadcast
                                                                        │
                                                                        ▼
All connected clients ← WebSocket update ← Real-time engine ← Stats updated
        │
        ▼
React state update → 3D plant transitions to new growth state
```

## 3D Plant Visualization

The plant is procedurally generated using seeded hashing for deterministic, consistent appearance across sessions.

### Growth Stages

| Stage | Contributions | Visual |
|---|---|---|
| Seed | 0–9 | Initial germination |
| Sprout | 10–49 | Early growth with visible leaves |
| Plant | 50–199 | Established foliage and branching |
| Tree | 200+ | Mature tree with full canopy |

### Environmental Effects
- **Time of day** — Lighting transitions from sunrise → day → dusk → night
- **Seasons** — Ground cover, flowers, falling leaves, and snow reflect the current month
- **Particles** — Seasonal effects like autumn leaves and winter snowflakes

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- Google OAuth credentials

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/emmsdgl/UMakLaudatoSi.git
   cd UMakLaudatoSi
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the required environment variables:
   ```
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Security

- Row-Level Security (RLS) policies at the database level
- Server-side session validation for all API routes
- Rate limiting via timestamp checks
- OAuth tokens never exposed to client-side code
- Admin audit logging for all privileged actions
- QR code signing for redemption security
- User banning system for policy violations
- HTTPS enforced in production

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────────────────┐    │
│  │  Next.js App   │◄───────►│  React Three Fiber (3D)      │    │
│  │  (React UI)    │         │  - Procedural Plant           │    │
│  │                │         │  - Seasonal Environment       │    │
│  │  Dashboard     │         │  - Dynamic Lighting           │    │
│  │  Pledges       │         └──────────────────────────────┘    │
│  │  Calculator    │                                              │
│  │  Rewards       │                                              │
│  │  Wallet        │                                              │
│  │  Admin Panel   │                                              │
│  └───────┬────────┘                                              │
└──────────┼───────────────────────────────────────────────────────┘
           │ HTTPS
┌──────────┼───────────────────────────────────────────────────────┐
│          │               Next.js API Routes                      │
│  ┌───────▼──────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │ /api/auth    │  │ /api/     │  │ /api/    │  │ /api/     │  │
│  │ (NextAuth)   │  │ pledges   │  │ wallet   │  │ admin/*   │  │
│  └──────┬───────┘  └─────┬─────┘  └────┬─────┘  └─────┬─────┘  │
└─────────┼────────────────┼──────────────┼──────────────┼─────────┘
          │                │              │              │
          │ OAuth 2.0      │  Real-time WebSocket        │
┌─────────▼──────┐  ┌─────▼──────────────▼──────────────▼─────────┐
│ Google OAuth   │  │            Supabase Platform                 │
│ Identity       │  │  ┌──────────────────────────────────────┐   │
│ Provider       │  │  │  PostgreSQL Database                 │   │
└────────────────┘  │  │  users, pledges, rewards, donations  │   │
                    │  └──────────────────────────────────────┘   │
                    │  ┌──────────────────────────────────────┐   │
                    │  │  Real-time Engine (WebSockets)       │   │
                    │  └──────────────────────────────────────┘   │
                    └─────────────────────────────────────────────┘
```

## License

This project was developed for University of Makati as part of the Laudato Si' sustainability initiative.

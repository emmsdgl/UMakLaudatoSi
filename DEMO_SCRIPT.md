# Laudato Si' — Live Demo Script
### Presentation Walk-Through Guide (10-15 minutes)

---

## Before the Demo

- Have the app running on a laptop or projector
- Log in with a student account (for user features) and have an admin account ready to switch to
- Make sure the 3D plant is visible on the home page
- Have the Carbon Footprint Calculator ready (not yet completed on this account, ideally)

---

## Part 1: The Hook (2 minutes)

**[Show the Home Page with the 3D Plant]**

> "This is Laudato Si' — our campus sustainability platform. What you're looking at is a living, growing 3D plant. It represents the collective environmental effort of every student at UMak. Every time a student makes an eco-pledge, this plant grows a little more. Right now it's at [current stage] — our goal is to grow it into a full tree together."

**Action:** Rotate the plant, show the time-of-day lighting changes.

> "This isn't a static image. It's a procedurally generated 3D model that changes with the time of day, the season, and most importantly — with student participation."

---

## Part 2: The Student Experience (5 minutes)

### Step 1 — Carbon Footprint Calculator

**[Navigate to /calculator]**

> "Every student starts here. This is a carbon footprint calculator designed specifically for Filipino students — it asks about jeepney commutes, canteen meals, AC usage, water habits. Things our students actually deal with."

**Action:** Click through 2-3 questions to show the interface. If possible, show a completed result.

> "At the end, students see their estimated monthly CO2 emissions broken down by category. The app then recommends an Eco-Path based on their biggest impact area."

### Step 2 — Choosing an Eco-Path

**[Navigate to /eco-paths]**

> "We have five Eco-Paths, each aligned with a sustainability category: Green Commute, Mindful Eating, Power Saver, Zero Waste Hero, and Water Guardian. Each path has six specific, achievable daily actions."

**Action:** Click on one Eco-Path to show the suggested actions.

> "For example, a student on the Green Commute path might commit to carpooling, biking, or taking the jeepney instead of a private vehicle. These are real, measurable actions — not vague promises."

### Step 3 — Making a Daily Pledge

**[Navigate to /pledges]**

> "Each day, a student creates a pledge album — they describe what they did and upload a photo as proof. This goes to our Student Affairs admin team for review."

**Action:** Show a pledge album with uploaded photos.

> "This is the accountability layer. Students can't just click a button — they have to show real evidence of environmental action. Admins review and grade each submission."

### Step 4 — Streaks and Points

> "Every consecutive day a student pledges, their points increase — Day 1 gives 1 point, Day 2 gives 2, all the way up to 5 points per day at Day 5 and beyond. Miss a day? The streak resets. It's the same psychology that makes Duolingo addictive."

**Action:** Point to the streak counter on the profile or home page.

### Step 5 — Eco-Wordle

**[Navigate to /wordle]**

> "To keep students coming back even on lazy days, we built Eco-Wordle — a daily word puzzle with sustainability-themed words. Win the puzzle, earn seeds. Seeds contribute to the plant growth and have their own leaderboard."

**Action:** Play one round (or show a completed game).

> "This is our engagement insurance. Even students who skip their pledge today will still open the app for Wordle."

### Step 6 — Rewards

**[Navigate to /rewards]**

> "Here's where it gets real. Students spend their earned points on actual rewards — food and beverages from the canteen, university merchandise, event tickets, digital vouchers. When they redeem, they get a QR code."

**Action:** Show the rewards grid, click on one reward to show details and point cost.

> "Our canteen staff scan the QR code to verify the redemption. No cheating, no double-spending. It's a complete transaction system."

### Step 7 — Leaderboards

**[Navigate to /ranks]**

> "And of course — competition. Students are ranked by their streaks. Daily, weekly, monthly, and all-time views. Nothing motivates a college student quite like seeing their name above their classmates."

---

## Part 3: The Admin Side (3 minutes)

**[Switch to admin account, navigate to /admin]**

> "Now let me show you the institutional side. This isn't just a student app — it's a managed platform with proper governance."

### Admin Dashboard

> "The admin dashboard shows real-time stats: total users, pledges submitted today, points distributed, active streaks, donations received. Everything leadership needs to measure program impact."

**Action:** Point to key stats on the dashboard.

### Pledge Review

**[Navigate to /admin/pledges]**

> "Student Affairs staff review pledge submissions here. They can view uploaded photos, verify the action was real, and assign points. This is the quality control that makes our data trustworthy."

### Rewards Management

**[Navigate to /admin/rewards]**

> "Admins manage the entire rewards catalog — set point costs, stock limits, validity dates. Canteen partners can list their own items."

### Audit Logs

**[Navigate to /admin/audit-logs]**

> "Every single admin action is logged — who did what, when, from where, with before-and-after values. This is the transparency layer that makes the system auditable and accountable."

### Role-Based Access

> "We have four admin tiers: Super Admin for full control, Student Affairs for pledge management, Finance for donation verification, and Canteen Admin for reward fulfillment. Each sees only what they need."

---

## Part 4: The Close (2 minutes)

**[Return to home page, show the 3D plant]**

> "So to summarize: students discover their environmental impact, commit to a path, take daily action with photo proof, earn points, redeem real rewards, and compete with classmates — all while growing this shared plant together."

> "This directly answers Pope Francis's call in Laudato Si' for ecological education and conversion. It gives UMak measurable sustainability data for accreditation. And most importantly, it makes students genuinely excited to do something good for the environment."

> "What we're proposing is a one-semester pilot with one college or department. We measure participation, engagement, and impact. The platform is already built, tested, and ready to deploy."

> "The question isn't whether sustainability matters — it's whether we make it matter to our students. This platform does exactly that."

---

## Q&A Preparation — Quick Answers

| Question | Answer |
|----------|--------|
| "What's the cost?" | Infrastructure runs on free tiers (Supabase, Vercel). Main cost is the rewards budget — which canteen partners can sponsor. |
| "Who maintains it?" | Student Affairs manages pledges, Finance handles donations, Canteen handles rewards. Super Admin oversees all. Built-in roles. |
| "Is it secure?" | Google OAuth (no passwords), Row-Level Security on all data, complete audit logging, QR-signed redemption codes. |
| "What if students cheat?" | Photo proof + admin review + one pledge/day limit + ban system + audit trail. Multiple layers of verification. |
| "Can it scale?" | Architecture supports thousands of users. API-first design means a mobile app can be added later. |
| "How is this different from a survey?" | Surveys are one-time. This is daily engagement with streaks, rewards, and social competition. It builds habits, not just data. |
| "What data do we get?" | Daily pledges, carbon footprint baselines, participation rates, streak lengths, reward redemptions, donation volumes — all exportable. |
| "Does this align with accreditation?" | Yes — generates measurable sustainability metrics aligned with UN SDGs and the Laudato Si' Action Platform. |

---

## Key Phrases to Use

- "Behavioral science-backed engagement"
- "Measurable sustainability outcomes"
- "Institutional governance built in"
- "Responding to Pope Francis's call for ecological conversion"
- "Making sustainability a daily habit, not a yearly event"
- "The Duolingo of campus sustainability"
- "UMak as a model Catholic university for ecological action"

# Campus Store - Product Requirements Document

## Original Problem Statement
Campus Store is a college-exclusive Buy & Borrow Marketplace - a multi-tenant SaaS platform where each college is an isolated tenant. Users can Buy or Borrow (Rent) items within their college campus.

## Architecture
- **Frontend**: React with TailwindCSS and Shadcn UI components
- **Backend**: FastAPI with Python
- **Database**: MongoDB with multi-tenant college isolation
- **Payments**: Stripe integration for buy and borrow transactions
- **Authentication**: JWT-based with bcrypt password hashing

## User Personas
1. **Students (Buyers/Borrowers)**: College students looking to buy/borrow items affordably
2. **Students (Sellers/Lenders)**: Students wanting to sell or rent out their unused items
3. **Admins**: Platform administrators managing colleges and disputes (future)

## Core Requirements (Static)
- College isolation (users only see items from their campus)
- Buy and Borrow are separate transaction flows
- Deposit holding for rentals (refunded on return)
- Student verification system
- Trust through ratings and reviews

## What's Been Implemented (Jan 2026)
### Backend APIs (100% complete)
- ✅ Authentication (signup, login, profile)
- ✅ College management with seeding
- ✅ Item CRUD with filtering (category, mode, search)
- ✅ Orders (buy flow) with status tracking
- ✅ Borrow requests with approval workflow
- ✅ Stripe payment integration
- ✅ Reviews and ratings
- ✅ Dashboard stats

### Frontend Pages (100% complete)
- ✅ Landing page with hero, features, FAQs
- ✅ Signup with college selection
- ✅ Login with JWT auth
- ✅ Dashboard with stats and featured items
- ✅ Browse page with Buy/Borrow toggle and filters
- ✅ Item detail with buy/borrow actions
- ✅ List item form with pricing options
- ✅ Orders/Activity with tabs (Bought, Sold, Borrowed, Lent, Listed)
- ✅ Profile page with user stats and reviews
- ✅ Payment pages (checkout, success, cancel)

## Prioritized Backlog
### P0 (Critical)
- (None - MVP complete)

### P1 (Important)
- Image upload for listings (currently using URLs)
- Email verification for signups
- Push notifications for borrow approvals/returns
- In-app chat between buyers and sellers

### P2 (Nice to Have)
- Admin panel for college management
- Student ID verification workflow
- Dispute handling system
- Platform fee on transactions
- Analytics dashboard

## Next Tasks
1. Implement image upload with cloud storage
2. Add email notifications for key events
3. Build admin panel for moderation
4. Enhanced search with more filters

# FurniHub - Multi-Vendor Marketplace

FurniHub is a production-ready, full-stack multi-vendor marketplace built specifically for premium furniture and home goods. It leverages the MERN stack (MongoDB, Express, React, Node.js) styled with a luxury, minimalist aesthetic using Tailwind CSS. 

## 🚀 Tech Stack

### Frontend
- **Framework:** React.js (via Vite)
- **State Management:** Zustand (Client State), React Query (Server State)
- **Styling:** Tailwind CSS (Premium minimalist design system)
- **Routing:** React Router v6
- **Forms & Validation:** React Hook Form + Zod
- **API Client:** Axios (with automated token refresh interceptors)
- **SEO Elements:** React Helmet Async, JSON-LD Schema integration

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose (Advanced Schema models, relationships & indexing)
- **Authentication:** JWT (Stateless memory Access Tokens + HTTP-Only Refresh Cookies)
- **Security:** Helmet, express-rate-limit, express-mongo-sanitize, xss-clean, hpp, compression
- **Image Processing:** Cloudinary API + Sharp + Multer (WebP transformations)
- **Payments:** Stripe Payments & Webhooks
- **Caching:** Redis (Upstash)
- **Mailing:** Nodemailer (SMTP)

---

## 🔥 Key Features

### 🛒 Customer Experience
- Browse curated, high-end furniture items with powerful search, category filtering, and sorting.
- Beautiful, high-performance **Product Details** featuring dynamic 3D-effect carousels (if implemented) or minimalist image galleries. 
- Real-time **Cart** drawer and checkout flow linked deeply with Zustand state.
- **Stripe Elements** embedded secure checkout.
- Authenticated user **Order Tracking** and History timelines.

### 🏪 Vendor Experience
- Dedicated **Vendor Dashboard** analyzing net revenue, total sales, and average order value.
- Management system allowing vendors to upload multiple product images directly to **Cloudinary** (auto-cropped/WebP).
- Visibility controls to instantly pause or update product listings.

### 👑 Admin Privileges
- Absolute platform oversight via the **Admin Dashboard**.
- Aggregate visualizations tracking absolute platform gross sales vs operational revenue (assuming fixed platform fee).
- Tools to approve, ban, or feature **Users, Vendors, and Products**.

---

## 🛠 Project Architecture

The monorepo structure is distinctively split between the API and the Client:

```
furnihub/
├── backend/
│   ├── src/
│   │   ├── config/       # Environment, Database, Redis setups
│   │   ├── controllers/  # API business logic per entity
│   │   ├── middleware/   # JWT verification, Role checks, Rate limiters, Error catchers
│   │   ├── models/       # Mongoose Schemas (User, VendorProfile, Product, Order, etc.)
│   │   ├── routes/       # Express Router module integrations
│   │   ├── services/     # Third-party services (Cloudinary, Email rendering)
│   │   └── utils/        # Error classes, loggers, helper logic
│   ├── server.js         # Entry point defining server init logic
│   └── app.js            # Express application middleware pipeline & mounting
│
└── frontend/
    ├── src/
    │   ├── components/   # UI generic pieces (Loaders, Buttons, Input, Sidebar)
    │   ├── pages/        # Route boundaries (Auth, Customer, Admin, Vendor)
    │   ├── services/     # API Axios configurations
    │   ├── store/        # Zustand application-wide context stores
    │   ├── App.jsx       # Route declarations
    │   └── index.css     # Global standardizations via Tailwind base
    ├── tailwind.config.js# Curated design system (Colors, Fonts)
    └── package.json
```

---

## 💻 Environment Variables Configuration

Both pieces of the application require their own specific `.env` injections.

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/furnihub

# Security
ACCESS_TOKEN_SECRET=your_access_secret_here
REFRESH_TOKEN_SECRET=your_refresh_secret_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
ADMIN_REGISTRATION_SECRET=secret_phrase_to_allow_admin_creation

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe 
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mailing System
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=FurniHub <noreply@furnihub.com>

PLATFORM_FEE_PERCENT=2.5
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_STRIPE_PUB_KEY=pk_test_...
```

---

## ⚙️ Installation & Execution

**1. Clone the environment and launch MongoDB locally or configure Atlas URI.**

**2. Backend Initialization:**
```bash
cd backend
npm install
# Optional: Seed the database with fake Products, an Admin, Vendor, and Customer
node seed.js 
npm run dev
```

**3. Frontend Initialization:**
```bash
cd frontend
npm install
npm run dev
```

The application is now accessible at `http://localhost:5173`. 
The API is running simultaneously at `http://localhost:5000`.

---

## 🔐 Advanced Implementation Details

### Automated Refresh Token System (Axios)
To adhere to strict XSRF security practices, **no JWT access tokens are saved in LocalStorage**. Access tokens live entirely in React State (`zustand - authStore.js`) while an incredibly secure, **HTTP-Only, Secure, SameSite Refresh Cookie** controls the issuance flow.

If an Access Token inevitably expires, the Axios interceptor in `services/api.js`:
1. Pauses the outgoing requests queue.
2. In the background hits `GET /api/v1/auth/refresh`.
3. Exchanges the user's secured cookie for a fresh access token.
4. Resumes and resolves the paused requests automatically without booting the user to the login screen.

### Error Handling Philosophy
Centralized via `backend/src/middleware/error.js`. Every API error bubbles up to this exact middleware ensuring absolutely no unhandled promise rejections take down the server, and ensuring production environments obscure stack trace logs.

### Modular Role-Based Routing
`DashboardLayout.jsx` intercepts routes for `/admin/*` and `/vendor/*`. If the user's decoded token role mismatches, `react-router-dom` implicitly bounces them back to `/` eliminating manual authorization validation checks inside every internal component.

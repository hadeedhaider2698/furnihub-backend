# FurniHub Backend

The backend server for FurniHub, a premium multi-vendor furniture marketplace. Built with **Node.js, Express, and MongoDB**, it provides a robust RESTful API for user authentication, product management, orders, cart manipulation, and vendor functionalities.

## 🚀 Technologies Used
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **File Uploads:** Cloudinary & Multer
- **Validation:** Joi
- **Security:** Helmet, Express Rate Limit, XSS-Clean, CORS

## 📦 Features
- **User Authentication:** Registration, login, and token refresh system.
- **Role-Based Access Control:** Separate specific capabilities for `customer`, `vendor`, and `admin`.
- **Product Management:** Full CRUD operations for vendors to manage their store catalogue.
- **Image Processing:** Direct integration with Cloudinary for handling product and profile imagery.
- **Store Following System:** Customers can follow vendors, tracking their counts and activities.
- **Cart & Wishlist API:** Secure and synchronized state handling for customer carts and saved products.
- **Global Error Handling:** Environment-specific (dev vs. prod) logging and structured response formats.

## 🛠️ Setup & Installation

**Prerequisites:** Node.js (v18+) and MongoDB installed locally or a MongoDB Atlas URI.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables Config:**
   Create a `.env` file in the `backend` directory matching the configuration required (see below).

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The backend will start processing requests at `http://localhost:5000`.

4. *(Optional)* **Seed Database:**
   Populate your database with dummy users, vendors, and products for testing.
   ```bash
   npm run seed
   ```

## 🔒 Environment Variables
Your `.env` file should include the following parameters:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_secret_key
REFRESH_TOKEN_SECRET=your_refresh_secret_key

# Cloudinary Setup for Media
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 📡 API Endpoints Overview
* `/api/v1/auth` - Register, login, refresh tokens, and manage "Follow" actions.
* `/api/v1/products` - Filter, search, and manage individual product listings.
* `/api/v1/vendor` - Manage vendor store profiles, analytics, and stats.
* `/api/v1/users` - Admin operations for user account control.
* `/api/v1/cart` - Cart modifications securely tied to user sessions.
* `/api/v1/wishlist` - Wishlist additions and removals.
* `/api/v1/orders` - Order initiation and histories.

## 🧪 Testing
Run backend unit/integration tests with:
```bash
npm run test
```

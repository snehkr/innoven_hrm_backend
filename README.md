# 🛠️ Innoven Support - Backend

A robust, multi-role backend engine designed to manage the entire lifecycle of service and installation requests — from verified customer onboarding to engineer task completion and warranty activation.

---

## 🏗️ Tech Stack

| Layer            | Technology                                             |
| ---------------- | ------------------------------------------------------ |
| **Core**         | Node.js, Express.js                                    |
| **Database**     | MongoDB with Mongoose ODM                              |
| **Security**     | JWT (JSON Web Tokens), Bcrypt, Helmet, Rate Limiting   |
| **Integrations** | Nodemailer (OTP/Email), ImageKit (Photo Proof Storage) |
| **Environment**  | Dotenv for secure configuration                        |

---

## 🚀 Key Features

### 1. 🛡️ Advanced Authentication

- Multi-role support: `super_admin`, `service_center`, `engineer`, `retailer`, `customer`.
- Secure JWT-based session management.
- Protected routes with granular role-based access control (RBAC).

### 2. 📋 Integrated Customer Onboarding

- **Verified Registration:** Seamlessly register a customer, their product, and a service ticket in a single atomic workflow.
- **Auto-Account Creation:** Automatically creates a mobile-ready `User` account for new customers with a default password (`pass123`).
- **OTP Pre-Verification:** Ensures customer email validity via OTP before any database records are created.

### 3. 🔧 Service & Installation Management

- **Universal Tracking:** Unified handling for both Installations and Repair/Service requests.
- **Dynamic Timeline:** Real-time event logging for every ticket (Assignment -> Visiting -> OTP -> Completion).
- **Photo Evidence:** Securely stores and serves proof of service images via ImageKit.

### 4. 📊 Admin & Analytics

- Paginated and searchable lists for Products, Customers, and Tickets.
- Comprehensive dashboard analytics for tracking performance and ticket volume.

---

## 📡 Essential API Endpoints

### 🔐 Authentication & Users

- `POST /api/auth/login` - Secure login for all roles.
- `GET /api/auth/users` - Manage system users (Admin only).

### 🤝 Onboarding & Service Requests

- `POST /api/otp/onboarding/send` - Send verification OTP to a new customer's email.
- `POST /api/otp/onboarding/verify` - Verify OTP to enable the onboarding flow.
- `POST /api/service-requests/onboard-request` - **Primary Onboarding:** Creates User, Customer, Product, and Ticket in one go.
- `GET /api/service-requests` - List all service/repair requests (filtered & paginated).

### 📺 Installations

- `GET /api/installations` - List all installation requests.
- `POST /api/installations` - Standard installation request creation.
- `PATCH /api/installations/:id/assign-engineer` - Assign a specific engineer to a task.

### 📱 Engineer Operations

- `POST /api/otp/send` - Send verification OTP during site visit.
- `POST /api/otp/verify` - Verify customer OTP on-site.
- `PATCH /api/installations/:id/complete` - Upload proof and finalize the ticket.

---

## 🛠️ Maintenance & Utilities

### Data Migration

If historical records show `null` for customer details due to the migration from User IDs to Customer Profile IDs, run the following utility (Super Admin only):

- `GET /api/service-requests/migrate` - Synchronizes historical ticket data with Customer profiles.

---

## 🚢 Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Configuration:**
   Create a `.env` file based on `example.env` with your MongoDB URI, JWT Secret, and SMTP credentials.
3. **Run Server:**
   ```bash
   npm run dev
   ```

---

&copy; 2026 Innoven Support System. All Rights Reserved.

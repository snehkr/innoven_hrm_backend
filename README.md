# 📺 Service Lifecycle Management System

A full-stack, multi-role platform to manage the complete lifecycle of TV installations — from retail sale to warranty activation.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, MongoDB, JWT |
| Admin Panel | React.js, Vite, Tailwind CSS, Recharts |
| Mobile App | Flutter, Provider, go_router |
| Email / OTP | Nodemailer (Gmail SMTP) |
| File Storage | ImageKit |
| Security | Helmet, express-rate-limit, bcryptjs |

---

## 🔄 Workflow

```
Retailer → Register Product (Barcode Generated)
       ↓
Create Installation Request
       ↓
Super Admin assigns Service Center
       ↓
Service Center assigns Engineer
       ↓
Engineer visits → Scans Barcode → OTP Sent to Customer
       ↓
Engineer verifies OTP → Uploads Photo Proof
       ↓
Installation COMPLETED → Warranty Activated
```

---

## 🚀 Local Setup

### Backend

```bash
cd innoven_hrm_backend
npm install
cp example.env .env
npm run dev
```

### Admin Panel

```bash
cd innoven_hrm_admin_panel
npm install
npm run dev
```

### Flutter App

```bash
cd hrm_mobile_app
flutter pub get
flutter run
```

---

## 🔐 Environment Variables (Backend)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_gmail@gmail.com
SMTP_PASS=your_app_password
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

---

## 👥 Roles

| Role | Access |
|------|--------|
| super_admin | Full system control |
| service_center | Assign engineers, view tickets |
| engineer | Mobile app, scan barcodes, verify OTP, upload proof |
| retailer | Register products and customers, create install requests |
| customer | View installations |

---

## 📡 Key API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/users?role=engineer | List engineers |
| GET | /api/products | List products (paginated) |
| POST | /api/products | Add product + generate barcode |
| GET | /api/installations | List tickets (paginated + filtered) |
| POST | /api/installations | Create install request |
| PATCH | /api/installations/:id/assign-engineer | Assign engineer |
| POST | /api/otp/send | Send OTP to customer |
| POST | /api/otp/verify | Verify OTP |
| POST | /api/installations/:id/complete | Upload proof + complete |
| GET | /api/dashboard | Analytics and charts |

---

## 🚢 Deployment

- Backend: Deploy to Render or Railway. Set all env vars in the dashboard.
- Admin Panel: Deploy to Vercel. The vercel.json handles SPA routing.
- Mobile: Run flutter build apk --release for Android APK.
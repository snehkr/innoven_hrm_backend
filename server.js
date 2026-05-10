require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/db");

// Environment Validation
const requiredEnv = [
  "JWT_SECRET",
  "MONGO_URI",
];
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Import Routes
const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/productRoutes");
const installationRoutes = require("./src/routes/installationRoutes");
const otpRoutes = require("./src/routes/otpRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");

// Connect Database
connectDB();

const app = express();

// Security Middleware
app.use(helmet());
app.use(xss());
// express-mongo-sanitize: Express 5 makes req.query a read-only getter,
// so we manually sanitize only body & params to avoid the setter error.
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { allowDots: false });
  if (req.params) mongoSanitize.sanitize(req.params, { allowDots: false });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: { success: false, message: "Too many requests, please try again later." }
});
app.use("/api/auth/login", limiter);
app.use("/api/otp", limiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://innoven-hrm-admin-panel.vercel.app",
    ],
    credentials: true,
  }),
);
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Serve static uploads
app.use("/uploads", express.static("src/uploads"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/installations", installationRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Base Route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Service Lifecycle Management API" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server Error",
    error: err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

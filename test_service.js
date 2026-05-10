/**
 * Service Lifecycle Management System - End-to-End Test Script
 *
 * Tests the full workflow:
 * Register → Product → Installation Request → Assign Engineer → OTP → Dashboard Stats
 *
 * Usage: node test_service.js
 */

const BASE_URL = "https://innoven-hrm-backend.vercel.app/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function request(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

function pass(msg) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg, detail = "") {
  console.error(`  ❌ ${msg}${detail ? `: ${detail}` : ""}`);
}
function step(n, msg) {
  console.log(`\n[${n}] ${msg}`);
}
function assertStatus(res, expected, label) {
  if (res.status !== expected) {
    throw new Error(
      `${label} — expected HTTP ${expected}, got ${res.status}: ${JSON.stringify(res.data)}`,
    );
  }
  pass(`${label} → HTTP ${res.status}`);
}

// ─── Unique seed so re-runs don't collide ───────────────────────────────────
const SEED = Date.now();

// ─── Main Test ───────────────────────────────────────────────────────────────

async function testService() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Service Lifecycle Management System — E2E Test Suite  ");
  console.log("═══════════════════════════════════════════════════════");

  let adminToken, retailerToken, engineerToken;
  let customerId, engineerId, productId, requestId;

  try {
    // ── 1. Super Admin ──────────────────────────────────────────────────────
    step(1, "Authenticating Super Admin...");
    const adminRegRes = await request("/auth/register", "POST", {
      name: "Super Admin",
      email: "admin@gmail.com",
      password: "pass123",
      role: "super_admin",
    });
    if (adminRegRes.status === 201) {
      adminToken = adminRegRes.data.data.token;
      pass("Admin registered fresh.");
    } else {
      const loginRes = await request("/auth/login", "POST", {
        email: "admin@gmail.com",
        password: "pass123",
      });
      assertStatus(loginRes, 200, "Admin login");
      adminToken = loginRes.data.data.token;
    }

    // ── 2. Register Retailer ────────────────────────────────────────────────
    step(2, "Registering Retailer...");
    const retailerRes = await request("/auth/register", "POST", {
      name: "Samsung Electronics",
      email: `retailer.${SEED}@gmail.com`,
      password: "pass123",
      role: "retailer",
    });
    assertStatus(retailerRes, 201, "Retailer registration");
    retailerToken = retailerRes.data.data.token;

    // ── 3. Register Customer ────────────────────────────────────────────────
    step(3, "Registering Customer...");
    const customerRes = await request("/auth/register", "POST", {
      name: "Sneh Kumar",
      email: `snehkr.official@gmail.com`,
      password: "pass123",
      role: "customer",
    });
    assertStatus(customerRes, 201, "Customer registration");
    customerId = customerRes.data.data.user._id;

    // ── 4. Register Engineer ────────────────────────────────────────────────
    step(4, "Registering Engineer...");
    const engineerRes = await request("/auth/register", "POST", {
      name: "Praveen Kumar",
      email: `praveen@gmail.com`,
      password: "pass123",
      role: "engineer",
    });
    assertStatus(engineerRes, 201, "Engineer registration");
    engineerToken = engineerRes.data.data.token;
    engineerId = engineerRes.data.data.user._id;

    // ── 5. Add Product ──────────────────────────────────────────────────────
    step(5, "Adding Product (generates Barcode + QR on ImageKit)...");
    const productRes = await request(
      "/products",
      "POST",
      {
        model_name: "Samsung QLED 65",
        serial_number: `SN-${SEED}`,
        warranty_period_months: 24,
        customer_id: customerId,
      },
      retailerToken,
    );
    assertStatus(productRes, 201, "Product creation");
    productId = productRes.data.data.product._id;
    pass(`Barcode URL: ${productRes.data.data.product.barcode_image_url}`);
    pass(`QR Code URL: ${productRes.data.data.product.qr_code_url}`);

    // ── 6. Create Installation Request ──────────────────────────────────────
    step(6, "Creating Installation Request...");
    const instRes = await request(
      "/installations",
      "POST",
      { customer_id: customerId, product_id: productId },
      retailerToken,
    );
    assertStatus(instRes, 201, "Installation request created");
    requestId = instRes.data.data.request._id;
    pass(`Ticket: ${instRes.data.data.request.ticket_number}`);

    // ── 7. Assign Engineer (by Admin) ───────────────────────────────────────
    step(7, "Assigning Engineer to ticket...");
    const assignRes = await request(
      `/installations/${requestId}/assign-engineer`,
      "PATCH",
      { engineer_id: engineerId },
      adminToken,
    );
    assertStatus(assignRes, 200, "Engineer assignment");
    pass(`Status → ${assignRes.data.data.request.status}`);

    // ── 8. Verify Engineer Can See Assigned Job ─────────────────────────────
    step(8, "Verifying Engineer can fetch assigned jobs...");
    const jobsRes = await request(
      "/installations/assigned",
      "GET",
      null,
      engineerToken,
    );
    assertStatus(jobsRes, 200, "Assigned jobs fetch");
    const jobs = jobsRes.data.data.jobs;
    const myJob = jobs.find((j) => j._id === requestId);
    if (!myJob)
      throw new Error("Newly assigned ticket not found in engineer jobs list");
    pass(`Found ticket in engineer job list (${jobs.length} total jobs)`);

    // ── 9. Send OTP ─────────────────────────────────────────────────────────
    step(9, "Sending OTP to customer email...");
    const otpRes = await request(
      "/otp/send",
      "POST",
      { request_id: requestId },
      engineerToken,
    );
    assertStatus(otpRes, 200, "OTP send");
    pass(otpRes.data.message);

    // ── 10. Dashboard Stats ─────────────────────────────────────────────────
    step(10, "Fetching Dashboard Analytics...");
    const dashRes = await request("/dashboard", "GET", null, adminToken);
    assertStatus(dashRes, 200, "Dashboard stats fetch");
    const d = dashRes.data.data;
    pass(`Total Installations: ${d.totalInstallations}`);
    pass(`Total Products: ${d.totalProducts}`);
    pass(`Pending Jobs: ${d.pendingJobs}`);
    pass(`Completed Jobs: ${d.completedJobs}`);
    pass(`Active Engineers: ${d.activeEngineersCount}`);
    pass(`Status Breakdown entries: ${d.charts?.statusBreakdown?.length ?? 0}`);

    // ── 11. Pagination & Search ─────────────────────────────────────────────
    step(11, "Testing Pagination + Search on Installations...");
    const searchRes = await request(
      `/installations?page=1&limit=5&search=TKT`,
      "GET",
      null,
      adminToken,
    );
    assertStatus(searchRes, 200, "Paginated search");
    const pg = searchRes.data.data.pagination;
    pass(`Total tickets matching 'TKT': ${pg.total}, Page 1 of ${pg.pages}`);

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════════");
    console.log("  All tests passed! ✅");
    console.log("  Note: OTP verification requires the 4-digit code");
    console.log("  emailed to the customer — cannot be auto-verified.");
    console.log("═══════════════════════════════════════════════════════\n");
  } catch (error) {
    console.log("\n═══════════════════════════════════════════════════════");
    console.error(`  Test Failed ❌: ${error.message}`);
    console.log("═══════════════════════════════════════════════════════\n");
    process.exit(1);
  }
}

testService();

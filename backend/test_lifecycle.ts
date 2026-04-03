import process from "node:process";

/**
 * Integration Test: Leave Application Lifecycle
 * This script hits the running local server at http://localhost:3001
 */

const API_URL = "http://localhost:3001";

async function testLifecycle() {
  console.log("Starting Leave Application Lifecycle Test...");

  // 1. Login as Employee
  console.log("\n1. Logging in as employee@team.com...");
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "employee@team.com", password: "employee123" }),
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }
  
  const { token, user: _employeeUser } = await loginRes.json();
  console.log("Logged in successfully. Token received.");

  const authHeaders = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1b. Check current balance
  console.log("\n2. Checking initial leave balance...");
  const balanceRes = await fetch(`${API_URL}/api/leaves/balance`, { headers: authHeaders });
  const initialBalance = await balanceRes.json();
  console.log("Initial Balance:", initialBalance);

  // 2. Apply for Leave
  console.log("\n3. Applying for leave (1 day)...");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const applyRes = await fetch(`${API_URL}/api/leaves`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      leaveType: "SICK",
      startDate: tomorrowStr,
      endDate: tomorrowStr,
      reason: "Integration test lifecycle",
    }),
  });

  if (!applyRes.ok) {
    throw new Error(`Application failed: ${await applyRes.text()}`);
  }

  const leaveRequest = await applyRes.json();
  console.log("Leave request created:", leaveRequest);
  const leaveId = leaveRequest.id;

  // 3. Verify it's PENDING
  console.log("\n4. Verifying request is PENDING...");
  const myRequestsRes = await fetch(`${API_URL}/api/leaves/my-requests`, { headers: authHeaders });
  const myRequests = await myRequestsRes.json();
  const found = myRequests.find((r: any) => r.id === leaveId);
  console.log("Request status:", found?.status);
  if (found?.status !== "PENDING") {
    throw new Error(`Expected status PENDING, got ${found?.status}`);
  }

  // 4. Login as Manager
  console.log("\n5. Logging in as manager@team.com...");
  const managerLoginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "manager@team.com", password: "manager123" }),
  });
  
  const { token: managerToken } = await managerLoginRes.json();
  const managerHeaders = {
    "Authorization": `Bearer ${managerToken}`,
    "Content-Type": "application/json",
  };

  // 5. Approve Leave
  console.log("\n6. Approving leave request...");
  const approveRes = await fetch(`${API_URL}/api/leaves/${leaveId}/approve`, {
    method: "PATCH",
    headers: managerHeaders,
    body: JSON.stringify({ status: "approved", reviewNotes: "Approved via integration test" }),
  });

  if (!approveRes.ok) {
    throw new Error(`Approval failed: ${await approveRes.text()}`);
  }
  console.log("Leave approved.");

  // 6. Verify Status and Balance as Employee
  console.log("\n7. Verifying final status and balance as employee...");
  const finalRequestsRes = await fetch(`${API_URL}/api/leaves/my-requests`, { headers: authHeaders });
  const finalRequests = await finalRequestsRes.json();
  const finalFound = finalRequests.find((r: any) => r.id === leaveId);
  console.log("Final status:", finalFound?.status);

  const finalBalanceRes = await fetch(`${API_URL}/api/leaves/balance`, { headers: authHeaders });
  const finalBalance = await finalBalanceRes.json();
  console.log("Final Balance:", finalBalance);

  if (finalFound?.status !== "APPROVED") {
    throw new Error(`Expected status APPROVED, got ${finalFound?.status}`);
  }
  
  if (finalBalance.availableLeaves !== initialBalance.availableLeaves - 1) {
    console.warn(`Balance warning: Expected ${initialBalance.availableLeaves - 1}, got ${finalBalance.availableLeaves}`);
  } else {
    console.log("Balance correctly updated.");
  }

  console.log("\nLifecycle test completed successfully!");
}

testLifecycle().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});

// Comprehensive Authentication Test Suite
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=================================================");
  console.log("COMMANDSKILL COMPREHENSIVE AUTH TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? "- " + detail : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? "- " + detail : ""}`);
      failed++;
    }
  }

  // 1. DEMO CREDENTIAL ENDPOINT
  console.log("--- TEST SUITE 1: DEMO ENDPOINT & MAPPINGS ---");
  try {
    const demoRes = await fetch(`${BASE_URL}/api/auth/demo`);
    const demoData = await demoRes.json();
    assert(demoRes.status === 200, "Demo accounts endpoint returns 200");
    assert(demoData.availableAccounts?.length === 4, "4 demo accounts returned", `${demoData.availableAccounts?.length} found`);
    const studentDemo = demoData.availableAccounts?.find(a => a.role === "STUDENT");
    const recruiterDemo = demoData.availableAccounts?.find(a => a.role === "RECRUITER");
    const collegeDemo = demoData.availableAccounts?.find(a => a.role === "COLLEGE_ADMIN");
    const adminDemo = demoData.availableAccounts?.find(a => a.role === "PLATFORM_ADMIN");
    assert(studentDemo?.email === "alex.rivera@stanford.edu", "Student demo email is alex.rivera@stanford.edu");
    assert(recruiterDemo?.email === "barun@stripe-careers.com", "Recruiter demo email is barun@stripe-careers.com");
    assert(collegeDemo?.email === "placement@stanford.edu", "College Dean demo email is placement@stanford.edu");
    assert(adminDemo?.email === "priya.menon@commandskill.io", "Admin demo email is priya.menon@commandskill.io");
  } catch (err) {
    assert(false, "Demo endpoint error", err.message);
  }

  // 2. DEMO AUTHENTICATION (ALL 4 ROLES)
  console.log("\n--- TEST SUITE 2: DEMO AUTHENTICATION (ALL 4 ROLES) ---");
  const demoAccounts = [
    { name: "Student", email: "alex.rivera@stanford.edu", password: "commandskill123", expectedDest: "/dashboard" },
    { name: "Recruiter", email: "barun@stripe-careers.com", password: "recruiter123", expectedDest: "/dashboard/recruiter" },
    { name: "College Dean", email: "placement@stanford.edu", password: "college123", expectedDest: "/college/dashboard" },
    { name: "Admin", email: "priya.menon@commandskill.io", password: "admin123", expectedDest: "/admin" },
  ];

  for (const acct of demoAccounts) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acct.email, password: acct.password }),
      });
      const data = await res.json();
      const cookies = res.headers.get("set-cookie") || "";

      assert(res.status === 200, `Login for ${acct.name}`, `Status: ${res.status}`);
      assert(data.success === true, `${acct.name} login success flag`);
      assert(Boolean(data.token), `${acct.name} receives JWT token`);
      assert(data.redirectUrl === acct.expectedDest, `${acct.name} destination`, `Got: ${data.redirectUrl}, Expected: ${acct.expectedDest}`);
      assert(cookies.includes("commandskill_access_token"), `${acct.name} session cookie set`);
    } catch (err) {
      assert(false, `Demo auth failed for ${acct.name}`, err.message);
    }
  }

  // 3. NORMAL LOGIN (VALID EXISTING USERS)
  console.log("\n--- TEST SUITE 3: NORMAL LOGIN WITH VALID CREDENTIALS ---");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alex.rivera@university.edu", password: "commandskill123" }),
    });
    const data = await res.json();
    assert(res.status === 200, "Normal login with valid email/password", `Status: ${res.status}`);
    assert(data.user?.email === "alex.rivera@university.edu", "Correct profile returned");
    assert(Boolean(data.token), "Token generated for normal login");
  } catch (err) {
    assert(false, "Normal login error", err.message);
  }

  // 4. INVALID LOGIN
  console.log("\n--- TEST SUITE 4: INVALID LOGIN CREDENTIALS ---");
  try {
    // Wrong password
    const resBadPass = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alex.rivera@stanford.edu", password: "wrongpassword999" }),
    });
    const badPassData = await resBadPass.json();
    assert(resBadPass.status === 401, "Wrong password rejected with 401", `Status: ${resBadPass.status}`);
    assert(badPassData.error?.length > 0, "Error message provided for bad password", badPassData.error);

    // Nonexistent user
    const resBadUser = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent.user.test@example.com", password: "password123" }),
    });
    const badUserData = await resBadUser.json();
    assert(resBadUser.status === 401, "Nonexistent user rejected with 401", `Status: ${resBadUser.status}`);
    assert(badUserData.error?.length > 0, "Error message provided for nonexistent user", badUserData.error);

    // Empty fields
    const resEmpty = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" }),
    });
    assert(resEmpty.status === 400, "Empty credentials rejected with 400", `Status: ${resEmpty.status}`);
  } catch (err) {
    assert(false, "Invalid login test error", err.message);
  }

  // 5. REGISTRATION FLOW (NEW STUDENT & NEW RECRUITER)
  console.log("\n--- TEST SUITE 5: ACCOUNT REGISTRATION ---");
  const testStudentEmail = `test.student.${Date.now()}@berkeley.edu`;
  const testStudentPassword = "studentPassword123!";

  try {
    const regStudentRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "Test Student Berkeley",
        email: testStudentEmail,
        password: testStudentPassword,
        university: "UC Berkeley",
      }),
    });
    const regStudentData = await regStudentRes.json();
    const studentCookies = regStudentRes.headers.get("set-cookie") || "";

    assert(regStudentRes.status === 201, "New student registration returns 201", `Status: ${regStudentRes.status}`);
    assert(regStudentData.success === true, "Student registration success flag");
    assert(regStudentData.user?.email === testStudentEmail, "Student profile has registered email");
    assert(Boolean(regStudentData.token), "Student registration returns JWT token");
    assert(studentCookies.includes("commandskill_access_token"), "Student registration sets session cookie");

    // Duplicate email registration should fail with 409
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "student",
        name: "Duplicate Tester",
        email: testStudentEmail,
        password: "newpassword123",
        university: "UC Berkeley",
      }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, "Duplicate email registration rejected with 409", `Status: ${dupRes.status}`);
    assert(dupData.error?.includes("already exists"), "Duplicate email produces clear message", dupData.error);
  } catch (err) {
    assert(false, "Student registration error", err.message);
  }

  // New Recruiter registration
  const testRecruiterEmail = `test.recruiter.${Date.now()}@anthropic-careers.com`;
  const testRecruiterPassword = "recruiterPassword123!";

  try {
    const regRecruiterRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "recruiter",
        name: "Test Recruiter Anthropic",
        email: testRecruiterEmail,
        password: testRecruiterPassword,
        phone: "+1-555-019-2834",
        companyName: "Anthropic",
        companyWebsite: "https://anthropic.com",
        companyLocation: "San Francisco, CA",
        companySize: "501 - 1,000 employees",
        companyType: "Technology & Software",
        jobTitle: "Principal Campus Recruiter",
        department: "University Programs",
        recruiterRole: "Talent Acquisition",
        recruiterUsage: ["Hire interns", "Manage applications"],
      }),
    });
    const regRecruiterData = await regRecruiterRes.json();
    assert(regRecruiterRes.status === 201, "New recruiter registration returns 201", `Status: ${regRecruiterRes.status}`);
    assert(regRecruiterData.user?.company === "Anthropic", "Recruiter profile created with company");
    assert(regRecruiterData.redirectUrl === "/dashboard/recruiter", "Recruiter redirected to /dashboard/recruiter");
  } catch (err) {
    assert(false, "Recruiter registration error", err.message);
  }

  // 6. REGISTRATION FOLLOWED BY LOGIN
  console.log("\n--- TEST SUITE 6: LOGIN WITH NEWLY REGISTERED ACCOUNTS ---");
  try {
    // Login with registered student
    const studentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testStudentEmail, password: testStudentPassword }),
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200, "Login with newly registered student", `Status: ${studentLoginRes.status}`);
    assert(studentLoginData.user?.email === testStudentEmail, "Student user matches registered account");

    // Login with registered recruiter
    const recruiterLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testRecruiterEmail, password: testRecruiterPassword }),
    });
    const recruiterLoginData = await recruiterLoginRes.json();
    assert(recruiterLoginRes.status === 200, "Login with newly registered recruiter", `Status: ${recruiterLoginRes.status}`);
    assert(recruiterLoginData.redirectUrl === "/dashboard/recruiter", "Recruiter login lands on /dashboard/recruiter");
  } catch (err) {
    assert(false, "Registered user login error", err.message);
  }

  // 7. PASSWORD RESET
  console.log("\n--- TEST SUITE 7: PASSWORD RESET ---");
  try {
    const resetEmail = testStudentEmail;
    const newPassword = "newResetPassword987!";
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail, newPassword }),
    });
    const resetData = await resetRes.json();
    assert(resetRes.status === 200, "Password reset returns 200", `Status: ${resetRes.status}`);
    assert(resetData.success === true, "Password reset success flag");

    // Login with new password
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail, password: newPassword }),
    });
    assert(newLoginRes.status === 200, "Login with reset password succeeds", `Status: ${newLoginRes.status}`);
  } catch (err) {
    assert(false, "Password reset error", err.message);
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

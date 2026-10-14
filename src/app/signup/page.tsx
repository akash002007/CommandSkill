"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  User,
  GraduationCap,
  Briefcase,
  Building,
  Phone,
  Globe,
  MapPin,
  Users,
  CheckCircle2,
  ShieldCheck,
  Check,
  Edit2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { UserRole } from "@/types";
import { isUniversityEmail } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { registerStudent, registerRecruiter } = useAuth();
  const { success, error: toastError } = useToast();

  const [role, setRole] = useState<UserRole>("student");

  // Recruiter Wizard Step: 1 | 2 | 3 | 4 | 5
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Common / Student state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [universityOrCompany, setUniversityOrCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Recruiter-specific state
  const [phone, setPhone] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companySize, setCompanySize] = useState("501 - 1,000 employees");
  const [companyType, setCompanyType] = useState("Technology & Software");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("University Talent & Early Career");
  const [recruiterRole, setRecruiterRole] = useState("Talent Acquisition");
  const [recruiterUsage, setRecruiterUsage] = useState<string[]>([
    "Hire interns",
    "Discover student talent",
    "Manage applications",
  ]);

  // Step-level validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleUsage = (item: string) => {
    setRecruiterUsage((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
    if (errors.recruiterUsage) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.recruiterUsage;
        return next;
      });
    }
  };

  // Step Validation logic
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required";
    if (!email.trim()) {
      errs.email = "Work email is required";
    } else if (!email.includes("@") || !email.includes(".")) {
      errs.email = "Please enter a valid email address";
    }
    if (!jobTitle.trim()) errs.jobTitle = "Job title is required";
    if (phone.trim() && phone.length < 7) {
      errs.phone = "Please enter a valid phone number";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!universityOrCompany.trim()) errs.company = "Company name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (recruiterUsage.length === 0) {
      errs.recruiterUsage = "Please select at least one primary hiring goal";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep4 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step Navigation handlers
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        setErrors({});
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
        setErrors({});
      }
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setCurrentStep(4);
        setErrors({});
      }
    } else if (currentStep === 4) {
      if (validateStep4()) {
        setCurrentStep(5);
        setErrors({});
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setErrors({});
    }
  };

  const handleJumpToStep = (stepNumber: number) => {
    if (stepNumber < currentStep || currentStep === 5) {
      setCurrentStep(stepNumber);
      setErrors({});
    }
  };

  // Student Form Submission
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required";
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      errs.email = "Valid student email is required";
    }
    if (!universityOrCompany.trim()) errs.university = "University is required";
    if (!password || password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const student = await registerStudent({
        name: name.trim(),
        email: email.trim(),
        university: universityOrCompany.trim(),
        password,
      });

      const isUni = isUniversityEmail(email);
      if (isUni) {
        success(`Account created! Institutional email verified for ${universityOrCompany || "your university"}.`);
      } else {
        success("Account created successfully! Welcome to CommandSkill.");
      }
      window.location.href = isUni ? "/dashboard" : "/onboarding?step=verification";
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred during registration.";
      setErrors({ global: msg });
      toastError(msg);
      setIsLoading(false);
    }
  };

  // Recruiter Account Creation Final Submit
  const handleRecruiterSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      setErrors({ global: "Please complete all required fields before creating account." });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const recruiter = await registerRecruiter({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        companyName: universityOrCompany.trim(),
        companyWebsite: companyWebsite.trim(),
        companyLocation: companyLocation.trim(),
        companySize,
        companyType,
        jobTitle: jobTitle.trim() || "Talent Acquisition Lead",
        department,
        recruiterRole,
        recruiterUsage,
      });

      success(`Welcome to CommandSkill Employer Suite, ${name}!`);
      window.location.href = "/dashboard/recruiter";
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred during registration.";
      setErrors({ global: msg });
      toastError(msg);
      setIsLoading(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Personal" },
    { num: 2, label: "Company" },
    { num: 3, label: "Role & Usage" },
    { num: 4, label: "Security" },
    { num: 5, label: "Review" },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-6 transition-all duration-300">
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <span className="font-black text-base tracking-tight text-white select-none">CS</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">
                CommandSkill
              </span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {role === "recruiter"
                ? "Create Recruiter & Employer Account"
                : "Create Your Student Account"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {role === "recruiter"
                ? "Connect with vetted student builders, engineers, and top campus talent."
                : "Join the professional ecosystem built for college talent and top companies."}
            </p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted border border-border">
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setErrors({});
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "student"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span>Student Account</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("recruiter");
                setErrors({});
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                role === "recruiter"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4 text-blue-500" />
              <span>Recruiter & Company</span>
            </button>
          </div>

          {/* ================= STUDENT SIGNUP FORM ================= */}
          {role === "student" ? (
            <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
              {/* Google Sign Up */}
              <div className="space-y-3">
                <GoogleSignInButton role="student" mode="signup" />
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-border w-full" />
                  <span className="bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                    Or register with student email
                  </span>
                  <div className="border-t border-border w-full" />
                </div>
              </div>

              {errors.global && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.global}</span>
                </div>
              )}

              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <Input
                    label="Full Name *"
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />
                  {errors.name && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="University / College Email *"
                    type="email"
                    placeholder="alex@stanford.edu"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    leftIcon={<Mail className="w-4 h-4" />}
                    required
                  />
                  {errors.email && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="University / Institution *"
                    placeholder="Stanford University"
                    value={universityOrCompany}
                    onChange={(e) => {
                      setUniversityOrCompany(e.target.value);
                      if (errors.university) setErrors((prev) => ({ ...prev, university: "" }));
                    }}
                    leftIcon={<GraduationCap className="w-4 h-4" />}
                    required
                  />
                  {errors.university && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.university}</p>
                  )}
                </div>

                <div>
                  <Input
                    label="Password *"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                  />
                  {errors.password && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-11 text-sm font-semibold justify-center shadow-md shadow-blue-600/20 cursor-pointer mt-2"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Complete Registration
                </Button>
              </form>
            </div>
          ) : (
            /* ================= RECRUITER MULTI-STEP ONBOARDING WIZARD ================= */
            <div className="space-y-6">
              {/* Progress Indicator */}
              <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-xs">
                <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
                  {stepsList.map((step, idx) => {
                    const isCompleted = step.num < currentStep;
                    const isCurrent = step.num === currentStep;
                    const isUpcoming = step.num > currentStep;

                    return (
                      <React.Fragment key={step.num}>
                        <button
                          type="button"
                          onClick={() => handleJumpToStep(step.num)}
                          disabled={isUpcoming}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                              : isCompleted
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                              : "text-muted-foreground opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCurrent
                                ? "bg-white text-blue-600"
                                : isCompleted
                                ? "bg-blue-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.num}
                          </div>
                          <span>{step.label}</span>
                        </button>

                        {idx < stepsList.length - 1 && (
                          <div
                            className={`h-0.5 flex-1 min-w-[12px] rounded-full mx-1 ${
                              isCompleted ? "bg-blue-600/50" : "bg-border"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Wizard Content Card */}
              <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
                {errors.global && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errors.global}</span>
                  </div>
                )}
                {/* STEP 1: PERSONAL & CONTACT INFORMATION */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Google Recruiter Sign Up */}
                    <div className="space-y-3">
                      <GoogleSignInButton role="recruiter" mode="signup" />
                      <div className="relative flex items-center justify-center">
                        <div className="border-t border-border w-full" />
                        <span className="bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                          Or enter recruiter details
                        </span>
                        <div className="border-t border-border w-full" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span>1. Personal & Contact Information</span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Tell us who you are and how candidates or CommandSkill can contact you.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Full Name *"
                          placeholder="Barun"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                          }}
                          leftIcon={<User className="w-4 h-4" />}
                          required
                        />
                        {errors.name && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Work Email *"
                          type="email"
                          placeholder="barun@stripe.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                          }}
                          leftIcon={<Mail className="w-4 h-4" />}
                          required
                        />
                        {errors.email && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Phone Number"
                          type="tel"
                          placeholder="+1 (555) 019-2834"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                          }}
                          leftIcon={<Phone className="w-4 h-4" />}
                        />
                        {errors.phone && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Job Title *"
                          placeholder="University Talent Lead"
                          value={jobTitle}
                          onChange={(e) => {
                            setJobTitle(e.target.value);
                            if (errors.jobTitle) setErrors((prev) => ({ ...prev, jobTitle: "" }));
                          }}
                          leftIcon={<Briefcase className="w-4 h-4" />}
                          required
                        />
                        {errors.jobTitle && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.jobTitle}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Input
                        label="Department"
                        placeholder="University Talent & Early Career"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        leftIcon={<Building className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: COMPANY & ORGANIZATION */}
                {currentStep === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-500" />
                        <span>2. Company & Organization</span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Tell us about the organization you represent.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Company Name *"
                          placeholder="Stripe"
                          value={universityOrCompany}
                          onChange={(e) => {
                            setUniversityOrCompany(e.target.value);
                            if (errors.company) setErrors((prev) => ({ ...prev, company: "" }));
                          }}
                          leftIcon={<Building className="w-4 h-4" />}
                          required
                        />
                        {errors.company && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.company}</p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Company Website"
                          type="url"
                          placeholder="https://stripe.com"
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          leftIcon={<Globe className="w-4 h-4" />}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                          Company Location
                        </label>
                        <Input
                          placeholder="San Francisco, CA"
                          value={companyLocation}
                          onChange={(e) => setCompanyLocation(e.target.value)}
                          leftIcon={<MapPin className="w-4 h-4" />}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                          Company Size
                        </label>
                        <select
                          value={companySize}
                          onChange={(e) => setCompanySize(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-blue-500"
                        >
                          <option>1 - 10 employees</option>
                          <option>11 - 50 employees</option>
                          <option>51 - 200 employees</option>
                          <option>201 - 500 employees</option>
                          <option>501 - 1,000 employees</option>
                          <option>1,001 - 5,000 employees</option>
                          <option>5,000+ employees</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                          Industry / Type
                        </label>
                        <select
                          value={companyType}
                          onChange={(e) => setCompanyType(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-blue-500"
                        >
                          <option>Technology & Software</option>
                          <option>FinTech</option>
                          <option>Healthcare & Biotech</option>
                          <option>E-Commerce</option>
                          <option>Consulting & Finance</option>
                          <option>Hardware & Robotics</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: RECRUITER ROLE & PLATFORM USAGE */}
                {currentStep === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span>3. Recruiter Role & Platform Usage</span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Tell us how you will use CommandSkill.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-2">
                        Your Hiring Role
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Recruiter",
                          "Talent Acquisition",
                          "Hiring Manager",
                          "HR / People Operations",
                          "Founder / Co-Founder",
                          "Engineering Manager",
                          "Other",
                        ].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRecruiterRole(r)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                              recruiterRole === r
                                ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500/40 font-bold shadow-xs"
                                : "bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/70"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-2">
                        Primary Goals on CommandSkill * (Select all that apply)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          "Hire interns",
                          "Hire full-time students",
                          "Discover student talent",
                          "Manage applications",
                          "Contact candidates",
                        ].map((usage) => {
                          const isChecked = recruiterUsage.includes(usage);
                          return (
                            <button
                              key={usage}
                              type="button"
                              onClick={() => toggleUsage(usage)}
                              className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold"
                                  : "bg-muted/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-muted/70"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md flex items-center justify-center text-white text-[10px] font-bold ${
                                  isChecked ? "bg-blue-600" : "border border-border"
                                }`}
                              >
                                {isChecked && "✓"}
                              </div>
                              <span>{usage}</span>
                            </button>
                          );
                        })}
                      </div>
                      {errors.recruiterUsage && (
                        <p className="text-[11px] text-rose-500 mt-2">{errors.recruiterUsage}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: ACCOUNT SECURITY */}
                {currentStep === 4 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-500" />
                        <span>4. Account Security</span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Secure your recruiter employer suite credentials.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="relative">
                          <Input
                            label="Password *"
                            type={showPassword ? "text" : "password"}
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                            }}
                            leftIcon={<Lock className="w-4 h-4" />}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>
                        )}
                      </div>

                      <div>
                        <div className="relative">
                          <Input
                            label="Confirm Password *"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (errors.confirmPassword) {
                                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                              }
                            }}
                            leftIcon={<Lock className="w-4 h-4" />}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>

                    {/* Password Strength Feedback */}
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs text-muted-foreground">
                      <div className="font-semibold text-foreground">Password requirements:</div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                            password.length >= 6
                              ? "bg-emerald-500 text-white"
                              : "bg-muted-foreground/30 text-transparent"
                          }`}
                        >
                          ✓
                        </div>
                        <span>Minimum 6 characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                            password && password === confirmPassword
                              ? "bg-emerald-500 text-white"
                              : "bg-muted-foreground/30 text-transparent"
                          }`}
                        >
                          ✓
                        </div>
                        <span>Passwords match</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: REVIEW & CREATE ACCOUNT */}
                {currentStep === 5 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>5. Review & Create Account</span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Review your recruiter information before creating your CommandSkill account.
                      </p>
                    </div>

                    {errors.global && (
                      <div className="p-3 rounded-xl bg-primary/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errors.global}</span>
                      </div>
                    )}

                    {/* Review Section 1: Personal Information */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          <span>Personal Information</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJumpToStep(1)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Full Name: </span>
                          <strong className="text-foreground">{name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Work Email: </span>
                          <strong className="text-foreground">{email}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span className="text-foreground">{phone || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Job Title: </span>
                          <strong className="text-foreground">{jobTitle}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Review Section 2: Company */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-blue-500" />
                          <span>Company & Organization</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJumpToStep(2)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Company Name: </span>
                          <strong className="text-foreground">{universityOrCompany}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Website: </span>
                          <span className="text-foreground">{companyWebsite || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location: </span>
                          <span className="text-foreground">{companyLocation || "Not specified"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Company Size: </span>
                          <span className="text-foreground">{companySize}</span>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <span className="text-muted-foreground">Industry / Type: </span>
                          <span className="text-foreground">{companyType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Review Section 3: Recruiter Role */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Recruiter Role & Goals</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJumpToStep(3)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-muted-foreground">Hiring Role: </span>
                          <strong className="text-foreground">{recruiterRole}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Platform Goals: </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {recruiterUsage.map((g) => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium border border-blue-500/20"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Section 4: Security */}
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-blue-500" />
                          <span>Security Credentials</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJumpToStep(4)}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="text-xs flex items-center gap-2">
                        <span className="text-muted-foreground">Password: </span>
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          Password set
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Buttons */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrevStep}
                      className="cursor-pointer"
                    >
                      &larr; Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 5 ? (
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      onClick={handleNextStep}
                      className="shadow-sm shadow-blue-600/20 cursor-pointer"
                    >
                      <span>
                        {currentStep === 1
                          ? "Next: Company \u2192"
                          : currentStep === 2
                          ? "Next: Role & Usage \u2192"
                          : currentStep === 3
                          ? "Next: Security \u2192"
                          : "Next: Review \u2192"}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="gradient"
                      size="sm"
                      onClick={handleRecruiterSubmit}
                      isLoading={isLoading}
                      className="shadow-md shadow-blue-600/25 cursor-pointer font-bold px-5"
                    >
                      Create Employer Suite Account &rarr;
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Link */}
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} CommandSkill Platform
      </footer>
    </div>
  );
}

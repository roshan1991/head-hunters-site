import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Components
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { ProofStrip } from "./components/home/ProofStrip";
import { Standards } from "./components/home/Standards";
import { Story } from "./components/home/Story";
import { GlobalReach } from "./components/home/GlobalReach";
import { Hero } from "./components/home/Hero";
import { ServicesBento } from "./components/home/ServicesBento";
import { EmployerSection } from "./components/home/EmployerSection";
import { JobsSection } from "./components/home/JobsSection";
import { ContactSection } from "./components/home/ContactSection";
import { WorkforceAnimation } from "./components/home/WorkforceAnimation";

function HomePage() {
  const [settings, setSettings] = useState<any>(null);
  const [latestJobs, setLatestJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, jobsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/jobs/latest')
        ]);
        
        const settingsData = await settingsRes.json();
        const jobsData = await jobsRes.json();
        
        setSettings(settingsData);
        setLatestJobs(Array.isArray(jobsData) ? jobsData : []);
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#04a891] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>
        {settings.show_hero && <Hero settings={settings} />}
        {settings.show_stats && <ProofStrip />}

        {/* Intro strip */}
        {settings.show_hero && (
          <section className="bg-[#f2f3ef] py-20">
            <div className="max-w-[1200px] mx-auto px-5">
              <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-14 items-start">
                <div>
                  <p className="eyebrow-dark eyebrow mb-4">People. Precision. Progress.</p>
                  <h2 className="text-[clamp(30px,4.5vw,58px)] font-black text-[#111413] leading-[0.95] tracking-tight">
                    A complete workforce partner.
                  </h2>
                </div>
                <div>
                  <p className="text-[#111413]/60 text-[17px] leading-relaxed mt-2">
                    Head Hunters is designed for businesses that need a clearer hiring process, stronger shortlist quality and operational support that scales beyond one vacancy. The platform leads with service, trust and outcomes.
                  </p>
                  <WorkforceAnimation />
                </div>
              </div>
            </div>
          </section>
        )}

        {settings.show_services && <ServicesBento settings={settings} />}
        {settings.show_standards && <Standards />}
        {settings.show_employer_flow && <EmployerSection />}
        {settings.show_jobs && <JobsSection recentJobs={latestJobs} />}
        {settings.show_story && <Story settings={settings} />}
        {settings.show_global_reach && <GlobalReach settings={settings} />}
        {settings.show_contact && <ContactSection settings={settings} />}
      </main>
      <Footer settings={settings} />
    </>
  );
}

import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AdminLayout } from "./components/layout/AdminLayout";
import { SmoothScroll } from "./components/layout/SmoothScroll";
import { FloatingButtons } from "./components/layout/FloatingButtons";
import TawkToWidget from "./components/TawkToWidget";

const aiChatEnabled = import.meta.env.VITE_ENABLE_AI_CHAT === "true";

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/Login').then(module => ({ default: module.LoginPage })));
const AdminJobsPage = lazy(() => import('./pages/admin/Jobs').then(module => ({ default: module.AdminJobsPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/Settings').then(module => ({ default: module.AdminSettingsPage })));
const AdminDashboardPage = lazy(() => import('./pages/admin/Dashboard').then(module => ({ default: module.AdminDashboardPage })));
const AdminInsightsPage = lazy(() => import('./pages/admin/Insights').then(module => ({ default: module.AdminInsightsPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/Users').then(module => ({ default: module.AdminUsersPage })));
const AdminEnquiriesPage = lazy(() => import('./pages/admin/Enquiries').then(module => ({ default: module.AdminEnquiriesPage })));

const AdminChatPage = aiChatEnabled ? lazy(() => import('./pages/admin/Chat').then(module => ({ default: module.AdminChatPage }))) : null;
const AdminAISettingsPage = aiChatEnabled ? lazy(() => import('./pages/admin/AISettings').then(module => ({ default: module.AdminAISettingsPage }))) : null;
const AdminKnowledgePage = aiChatEnabled ? lazy(() => import('./pages/admin/Knowledge').then(module => ({ default: module.AdminKnowledgePage }))) : null;
const AdminTawkSettingsPage = lazy(() => import('./pages/admin/TawkSettings').then(module => ({ default: module.AdminTawkSettingsPage })));
const AdminNotFound = lazy(() => import('./pages/admin/NotFound').then(module => ({ default: module.AdminNotFound })));
const AdminCandidatesPage = lazy(() => import('./pages/admin/Candidates').then(module => ({ default: module.AdminCandidatesPage })));

const JobsPage = lazy(() => import('./pages/Jobs').then(module => ({ default: module.JobsPage })));
const JobDetailPage = lazy(() => import('./pages/JobDetail').then(module => ({ default: module.JobDetailPage })));
const InsightsPage = lazy(() => import('./pages/Insights').then(module => ({ default: module.InsightsPage })));
const InsightDetailPage = lazy(() => import('./pages/InsightDetail').then(module => ({ default: module.InsightDetailPage })));
const UploadCVPage = lazy(() => import('./pages/UploadCV').then(module => ({ default: module.UploadCVPage })));
const ContactPage = lazy(() => import('./pages/Contact').then(module => ({ default: module.ContactPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicyPage })));
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditions').then(module => ({ default: module.TermsAndConditionsPage })));
const JobScamAwarenessPage = lazy(() => import('./pages/JobScamAwareness').then(module => ({ default: module.JobScamAwarenessPage })));

function App() {
  return (
    <SmoothScroll>
      <div className="grain" aria-hidden="true" />
      <div className="aurora" aria-hidden="true" />
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#04a891] border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/contact" element={<ContactPage />} />
            <Route path="/upload-cv" element={<UploadCVPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/job-scam-awareness" element={<JobScamAwarenessPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/insights/:slug" element={<InsightDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              } 
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="insights" element={<AdminInsightsPage />} />
              <Route path="enquiries" element={<AdminEnquiriesPage />} />
              {aiChatEnabled && AdminChatPage && <Route path="chat" element={<AdminChatPage />} />}
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="candidates" element={<AdminCandidatesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="tawk-settings" element={<AdminTawkSettingsPage />} />
              {aiChatEnabled && AdminAISettingsPage && <Route path="ai-settings" element={<AdminAISettingsPage />} />}
              {aiChatEnabled && AdminKnowledgePage && <Route path="knowledge" element={<AdminKnowledgePage />} />}
              <Route path="*" element={<AdminNotFound />} />
            </Route>
          </Routes>
        </Suspense>
        <FloatingButtons chatbotEnabled={false} />
        <TawkToWidget />
      </BrowserRouter>
    </SmoothScroll>
  );
}

export default App;

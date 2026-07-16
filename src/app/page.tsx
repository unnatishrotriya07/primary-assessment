"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  PlayCircle,
  ChevronDown,
  Play,
  Brain,
  Sparkles,
  CircleCheck,
  ShieldCheck,
  Shield,
  BarChart3,
  Upload,
  Zap,
  Lightbulb,
} from "lucide-react";

const LOGO_URL = "/momentum-logo.png";

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal-anim").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;

    function updateScrollReveal() {
      const windowHeight = window.innerHeight;

      document.querySelectorAll<HTMLElement>(".scroll-reveal-right, .scroll-reveal-left").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;

        const raw = 1 - (center - windowHeight * 0.3) / (windowHeight * 1.12);
        const progress = Math.max(0, Math.min(1, raw));

        const isRight = el.classList.contains("scroll-reveal-right");
        const offset = isRight ? 80 : -80;
        const translateX = offset * (1 - progress);
        const opacity = progress;

        el.style.transform = `translateX(${translateX}px)`;
        el.style.opacity = String(opacity);
      });

      document.querySelectorAll<HTMLElement>(".scroll-reveal-scale").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;

        const raw = 1 - (center - windowHeight * 0.6) / (windowHeight * 0.56);
        const progress = Math.max(0, Math.min(1, raw));

        const scale = 0.15 + 0.85 * progress;
        const opacity = progress;

        el.style.transform = `scale(${scale})`;
        el.style.opacity = String(opacity);
      });

      ticking = false;
    }

    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(updateScrollReveal);
        ticking = true;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollReveal();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQ_DATA = [
    {
      q: "Is Momentum compliant with data privacy standards?",
      a: "Absolutely. Momentum is SOC2 Type II, GDPR, and FERPA compliant. We use end-to-end encryption for all student data and house our servers in sovereign regional data centers.",
    },
    {
      q: "How does the AI prevent hallucinated questions?",
      a: "We use a proprietary Retrieval-Augmented Generation (RAG) framework. The AI is strictly bounded by the source material you provide, ensuring 100% academic factualness.",
    },
  ];

  return (
    <main>
      {/* ========== Header ========== */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop py-4 bg-glass-bg backdrop-blur-md border-b border-glass-border">
        <div className="flex items-center gap-3">
          <img
            alt="Momentum Logo"
            className="w-10 h-10 object-contain"
            src={LOGO_URL}
          />
          <span className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
            Momentum
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a
            className="text-primary font-bold border-b-2 border-primary pb-1 transition-all"
            href="#features"
          >
            Features
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors"
            href="#solutions"
          >
            Solutions
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors"
            href="#resources"
          >
            Resources
          </a>
          <a
            className="text-on-surface-variant hover:text-primary transition-colors"
            href="#pricing"
          >
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-6 py-2 rounded-full font-semibold text-sm text-on-surface-variant hover:text-primary transition-all active:scale-95"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-6 py-2 rounded-full font-semibold text-sm bg-primary text-on-primary hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      <div className="pt-20">
        {/* ========== Hero Section ========== */}
        <section className="relative h-[95vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 aurora-mesh opacity-20"></div>
          <div className="relative z-10 text-center max-w-5xl px-margin-mobile">
            <h1 className="font-display-lg text-display-lg text-on-surface mb-6">
              Empower Learning with{" "}
              <span className="iridescent-text">Adaptive Evaluation</span>
            </h1>
            <p className="font-body-lg text-xl text-on-surface-variant max-w-3xl mx-auto mb-12 leading-relaxed">
              Revolutionize institutional assessments with AI-driven testing,
              real-time insights, and a student-centric interface designed for the
              future of education.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Link
                href="/signup"
                className="px-12 py-5 rounded-full font-title-md text-lg bg-primary text-on-primary hover:shadow-2xl hover:shadow-primary/40 transition-all active:scale-95 flex items-center gap-3 group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-12 py-5 rounded-full font-title-md text-lg glass-card text-primary hover:bg-white/80 transition-all flex items-center gap-3">
                <PlayCircle className="w-5 h-5" />
                Watch Demo
              </button>
            </div>
          </div>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
            <ChevronDown className="w-12 h-12 text-primary" />
          </div>
        </section>

        {/* ========== Product Demo Section ========== */}
        <section className="py-24 px-margin-desktop bg-surface-container-low">
          <div className="max-w-6xl mx-auto text-center mb-16">
            <span className="font-accent text-2xl text-primary mb-4 block">
              See it in action
            </span>
            <h2 className="font-headline-lg text-4xl text-on-surface">
              Experience Precision Assessment
            </h2>
          </div>
          <div className="max-w-5xl mx-auto reveal-anim">
            <div
              className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white group cursor-pointer"
              onClick={() => {
                if (!videoRef.current) return;
                if (videoPlaying) {
                  videoRef.current.pause();
                  setVideoPlaying(false);
                } else {
                  videoRef.current.play();
                  setVideoPlaying(true);
                }
              }}
            >
              <video
                ref={videoRef}
                className="w-full aspect-video object-cover"
                src="/video_placeholder_files/VerQ-Demo.mp4"
                preload="metadata"
                muted
                playsInline
                onEnded={() => setVideoPlaying(false)}
              />
              <div
                className={`absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-all ${videoPlaying ? "bg-transparent opacity-0 pointer-events-none" : "bg-secondary/30 group-hover:bg-secondary/10"}`}
              >
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                  <Play className="w-12 h-12 text-primary ml-1" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-secondary/80 to-transparent">
                <p className="text-white font-headline-lg text-xl">
                  The Momentum Platform Overview
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== Features Section ========== */}
        <section id="features" className="py-32 px-margin-desktop space-y-32">
          <div className="max-w-7xl mx-auto text-center mb-24">
            <h2 className="font-headline-lg text-5xl text-on-surface mb-6">
              Precision Assessment Architecture
            </h2>
            <p className="font-body-lg text-xl text-on-surface-variant">
              Intelligent modules built for scalability and academic integrity.
            </p>
          </div>

          {/* Feature 1: Adaptive Testing */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center scroll-reveal-right">
            <div className="mockup-container">
              <div className="mockup-frame bg-white rounded-2xl shadow-2xl p-4 border border-glass-border">
                <div className="bg-surface-container-low rounded-xl aspect-[16/10] relative overflow-hidden">
                  <img
                    src="/screenshots/full-page.png"
                    alt="Adaptive Testing Dashboard"
                    className="w-full h-full object-cover object-top scale-110"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="font-headline-lg text-4xl text-on-surface mb-6">
                Adaptive Testing
              </h3>
              <p className="font-body-lg text-xl text-on-surface-variant leading-relaxed">
                Questions intelligently adapt to each student&apos;s ability level
                in real-time. No two assessments are alike, ensuring accurate
                measurement of true competency.
              </p>
            </div>
          </div>

          {/* Feature 2: Auto-Question Gen */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center scroll-reveal-left">
            <div className="order-2 lg:order-1">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-headline-lg text-4xl text-on-surface mb-6">
                Auto-Question Gen
              </h3>
              <p className="font-body-lg text-xl text-on-surface-variant leading-relaxed mb-8">
                Generate vast question banks from any syllabus in seconds using
                LLM-powered context awareness. Ensure complete curriculum coverage
                with minimal effort.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <CircleCheck className="w-5 h-5 text-primary shrink-0" />
                  Context-aware generation
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <CircleCheck className="w-5 h-5 text-primary shrink-0" />
                  Bloom&apos;s Taxonomy alignment
                </li>
              </ul>
            </div>
            <div className="mockup-container order-1 lg:order-2">
              <div
                className="mockup-frame bg-white rounded-2xl shadow-2xl p-4 border border-glass-border"
                style={{ transform: "rotateY(5deg) rotateX(2deg)" }}
              >
                <div className="bg-surface-container-low rounded-xl aspect-[16/10] relative overflow-hidden">
                  <img
                    src="/screenshots/dashboard-preview.png"
                    alt="Auto-Question Generation Interface"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Secure Proctoring */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center scroll-reveal-right">
            <div className="mockup-container">
              <div className="mockup-frame bg-white rounded-2xl shadow-2xl p-4 border border-glass-border">
                <div className="bg-surface-container-low rounded-xl aspect-[16/10] relative overflow-hidden">
                  <img
                    src="/screenshots/section-hero.png"
                    alt="Secure Proctoring Interface"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="font-headline-lg text-4xl text-on-surface mb-6">
                Secure Proctoring
              </h3>
              <p className="font-body-lg text-xl text-on-surface-variant leading-relaxed">
                Lockdown browsers, AI gaze tracking, and identity verification
                baked into a seamless experience. Maintain academic integrity
                without intrusive monitoring.
              </p>
            </div>
          </div>

          {/* Feature 4: Real-time Analytics */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center scroll-reveal-left">
            <div className="order-2 lg:order-1">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="font-headline-lg text-4xl text-on-surface mb-6">
                Real-time Analytics
              </h3>
              <p className="font-body-lg text-xl text-on-surface-variant leading-relaxed mb-8">
                Live dashboards for educators to identify learning gaps the moment
                they happen. Receive automated grading and diagnostic reports
                instantly.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 clay-card rounded-2xl text-center">
                  <p className="text-3xl font-bold text-primary font-headline-lg">
                    94%
                  </p>
                  <p className="text-sm text-on-surface-variant font-medium font-body-md">
                    Retention Rate
                  </p>
                </div>
                <div className="p-6 clay-card rounded-2xl text-center">
                  <p className="text-3xl font-bold text-primary font-headline-lg">
                    82%
                  </p>
                  <p className="text-sm text-on-surface-variant font-medium font-body-md">
                    Avg. Score
                  </p>
                </div>
              </div>
            </div>
            <div className="mockup-container order-1 lg:order-2">
              <div
                className="mockup-frame bg-white rounded-2xl shadow-2xl p-4 border border-glass-border"
                style={{ transform: "rotateY(5deg) rotateX(2deg)" }}
              >
                <div className="bg-surface-container-low rounded-xl aspect-[16/10] relative overflow-hidden">
                  <img
                    src="/screenshots/section-features.png"
                    alt="Real-time Analytics Dashboard"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== Interactive Process ========== */}
        <section className="py-24 bg-surface-container-low relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary blur-[120px] rounded-full"></div>
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary blur-[120px] rounded-full"></div>
          </div>
          <div className="relative z-10 px-margin-desktop max-w-6xl mx-auto">
            <div className="mb-20 text-center">
              <span className="px-6 py-2 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-[0.2em] mb-6 inline-block font-body-md">
                The Process
              </span>
              <h2 className="font-headline-lg text-5xl text-on-surface">
                Simplifying Complexity
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="clay-card rounded-3xl p-10 text-center group">
                <div className="w-20 h-20 rounded-3xl bg-primary text-white flex items-center justify-center mb-8 mx-auto shadow-xl group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="font-headline-lg text-2xl text-on-surface mb-4">
                  1. Configure Context
                </h4>
                <p className="font-body-md text-on-surface-variant leading-relaxed">
                  Upload curriculum or frameworks. Our AI maps the competency
                  matrix automatically.
                </p>
              </div>
              <div className="clay-card rounded-3xl p-10 text-center group">
                <div className="w-20 h-20 rounded-3xl bg-primary-container text-white flex items-center justify-center mb-8 mx-auto shadow-xl group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8" />
                </div>
                <h4 className="font-headline-lg text-2xl text-on-surface mb-4">
                  2. Deploy Engine
                </h4>
                <p className="font-body-md text-on-surface-variant leading-relaxed">
                  Students take assessments in a focused, low-distraction
                  environment tailored to their device.
                </p>
              </div>
              <div className="clay-card rounded-3xl p-10 text-center group">
                <div className="w-20 h-20 rounded-3xl bg-secondary text-white flex items-center justify-center mb-8 mx-auto shadow-xl group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-8 h-8" />
                </div>
                <h4 className="font-headline-lg text-2xl text-on-surface mb-4">
                  3. Harvest Insights
                </h4>
                <p className="font-body-md text-on-surface-variant leading-relaxed">
                  Receive automated grading and diagnostic reports highlighting
                  specific intervention areas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== FAQ Section ========== */}
        <section id="faq" className="py-32 px-margin-desktop max-w-4xl mx-auto">
          <div className="mb-16">
            <h2 className="font-headline-lg text-4xl text-on-surface mb-4">
              Curious Minds
            </h2>
            <p className="font-body-lg text-on-surface-variant">
              Answers to your technical and pedagogical questions.
            </p>
          </div>
          <div className="space-y-6">
            {FAQ_DATA.map((item, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl border border-glass-border overflow-hidden hover:border-primary transition-all cursor-pointer group accordion-item ${openFaq === index ? "open" : ""}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="p-8 flex items-center justify-between">
                  <h5 className="font-headline-lg text-xl text-on-surface group-hover:text-primary transition-colors">
                    {item.q}
                  </h5>
                  <ChevronDown className="w-6 h-6 text-on-surface-variant transition-transform duration-300 accordion-icon" />
                </div>
                <div className="px-8 pb-8 accordion-content text-on-surface-variant font-body-md leading-relaxed">
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== CTA Section ========== */}
        <section className="py-24 px-margin-desktop">
          <div className="max-w-6xl mx-auto aurora-mesh rounded-[48px] p-12 md:p-24 relative overflow-hidden flex flex-col md:flex-row items-center gap-16 shadow-2xl scroll-reveal-scale">
            <div className="absolute inset-0 bg-secondary/20 backdrop-blur-md"></div>
            <div className="relative z-10 md:w-1/2">
              <h2 className="font-display-lg text-5xl text-white mb-8">
                Ready to Define the Next Standard?
              </h2>
              <p className="font-body-lg text-xl text-white/90 mb-10 leading-relaxed">
                Join 500+ institutions already leveraging Momentum to personalize
                the educational journey.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-4">
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-primary/40"></div>
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-primary"></div>
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-secondary"></div>
                </div>
                <p className="font-medium text-white font-body-md">
                  Trusted by 2M+ Educators
                </p>
              </div>
            </div>
            <div className="relative z-10 md:w-1/2 w-full">
              <div className="glass-card rounded-[32px] p-10 border-white/30">
                <h3 className="font-headline-lg text-2xl text-on-surface mb-8">
                  Secure Your Access
                </h3>
                <form
                  className="space-y-6"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider block font-body-md">
                      Institutional Email
                    </label>
                    <input
                      className="w-full bg-white border-2 border-transparent rounded-2xl p-5 focus:ring-2 focus:ring-primary focus:border-primary shadow-inner placeholder:text-on-surface-variant/40 transition-all font-body-md"
                      placeholder="dean@university.edu"
                      type="email"
                    />
                  </div>
                  <button className="w-full py-5 rounded-2xl bg-primary text-on-primary font-headline-lg text-lg hover:bg-primary-container transition-all active:scale-[0.98] shadow-xl shadow-primary/30">
                    Request Early Access
                  </button>
                  <p className="text-center text-xs font-medium text-on-surface-variant opacity-70 font-body-md">
                    No credit card required. Personalized demo included.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========== Footer ========== */}
      <footer className="w-full px-margin-desktop py-20 bg-white border-t border-glass-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <img
                alt="Momentum Logo"
                className="w-8 h-8 object-contain"
                src={LOGO_URL}
              />
              <span className="font-headline-lg text-2xl font-black text-on-surface tracking-tighter">
                Momentum
              </span>
            </div>
            <p className="font-body-md text-on-surface-variant max-w-xs leading-relaxed">
              Precision engineering for pedagogic excellence. Defining the new
              standard in educational evaluation.
            </p>
            <p className="text-xs text-on-surface-variant/60 font-body-md">
              &copy; 2024 Momentum Assessment Systems. All rights reserved.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
            <div className="flex flex-col gap-4">
              <h6 className="font-bold text-on-surface uppercase text-xs tracking-widest font-headline-lg">
                Product
              </h6>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#features"
              >
                Features
              </a>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                Security
              </a>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                Integrations
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h6 className="font-bold text-on-surface uppercase text-xs tracking-widest font-headline-lg">
                Company
              </h6>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                About Us
              </a>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                Careers
              </a>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                Privacy Policy
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <h6 className="font-bold text-on-surface uppercase text-xs tracking-widest font-headline-lg">
                Support
              </h6>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                Documentation
              </a>
              <a
                className="text-sm text-on-surface-variant hover:text-primary transition-all font-body-md"
                href="#"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

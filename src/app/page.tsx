"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Shield, Globe, TrendingUp, Users,
  CheckCircle, ArrowRight, ArrowUpRight, ChevronDown,
  Zap, Lock, BarChart2, Quote, Briefcase, Sparkles, Star
} from "lucide-react";

const STATS = [
  { value: "2,400+", label: "Verified investors" },
  { value: "$48M+", label: "Deals facilitated" },
  { value: "1,800+", label: "Web2 & Web3 Jobs" },
  { value: "94%", label: "Match accuracy" },
];

const REACH_PILLARS = [
  {
    letter: "R",
    name: "Resources",
    tagline: "Infrastructure & Toolkits",
    desc: "Proprietary deal rooms, standardized legal templates, AI startup scoring, and real-time performance analytics.",
    icon: Shield,
  },
  {
    letter: "E",
    name: "Entrepreneurs",
    tagline: "Visionary Builders",
    desc: "Top-tier founders and engineering innovators building high-growth tech ventures across emerging and global hubs.",
    icon: Zap,
  },
  {
    letter: "A",
    name: "Access",
    tagline: "Direct Connection",
    desc: "Direct, KYC-verified access connecting entrepreneurs with active global capital allocators without gatekeepers.",
    icon: Users,
  },
  {
    letter: "C",
    name: "Capital",
    tagline: "Smart Funding Pipelines",
    desc: "Angel networks, syndicate funds, VC partners, and Web3 crypto rails ready to deploy into high-conviction deals.",
    icon: TrendingUp,
  },
  {
    letter: "H",
    name: "Horizons",
    tagline: "Borderless Expansion",
    desc: "Unlocking cross-border scale, multi-region market entry, and limitless international growth opportunities.",
    icon: Globe,
  },
];

// High-definition, reliable Unsplash stock photography & UI illustrations
const IMG = {
  hero: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
  features: [
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
  ],
  flow: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1000&auto=format&fit=crop",
  investors: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1000&auto=format&fit=crop",
  builders: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop",
  talent: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop",
  cta: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop",
  avatars: [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop",
  ],
};

const FEATURES = [
  {
    icon: Shield,
    title: "KYC-verified ecosystem",
    desc: "Every investor, builder, and job poster is identity-verified before accessing the platform. Zero bad actors.",
    span: "row-span-2",
    img: IMG.features[0],
  },
  {
    icon: Zap,
    title: "AI match engine",
    desc: "Our scoring engine matches investors with startups based on sector, ticket size, stage, and trust signals.",
    span: "",
    img: IMG.features[1],
  },
  {
    icon: Globe,
    title: "Truly borderless",
    desc: "Built for emerging markets. West Africa, Southeast Asia, MENA. Capital and tech talent flow globally.",
    span: "",
    img: IMG.features[2],
  },
  {
    icon: BarChart2,
    title: "Real-time analytics",
    desc: "Builders see who viewed their pitch, where they're from, and candidate application flow.",
    span: "",
    img: IMG.features[4],
  },
  {
    icon: Lock,
    title: "Deal & application pipeline",
    desc: "NDA → Term Sheet → Agreement → Hire. Every stage tracked, every document protected.",
    span: "",
    img: IMG.features[3],
  },
  {
    icon: Users,
    title: "Community forum & careers",
    desc: "A moderated global hub where investors, founders, and engineers connect and collaborate.",
    span: "row-span-2",
    img: IMG.features[5],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    role: "All Roles",
    title: "Create your verified profile",
    desc: "Complete identity verification and set your thesis as an Investor, Builder, or Job Seeker.",
  },
  {
    step: "02",
    role: "Investor & Talent",
    title: "AI matches & 24h early job access",
    desc: "Investors receive AI-scored startup deals (0–99). Pro Talent get 24h early access to new tech listings.",
  },
  {
    step: "03",
    role: "All Roles",
    title: "Chat, meet, apply & sign NDAs",
    desc: "Real-time messaging, calendar meetings, job applications, and NDA agreements in one platform.",
  },
  {
    step: "04",
    role: "All Roles",
    title: "Close deals & land global careers",
    desc: "Move through complete deal pipelines or get hired at top Web2 & Web3 startups.",
  },
];

const TESTIMONIALS = [
  {
    quote: "REACH connected me with a FinTech builder in Lagos within 48 hours. We closed a $250K deal in 6 weeks.",
    name: "Marcus T.",
    title: "Angel investor, London",
    avatar: IMG.avatars[0],
  },
  {
    quote: "As an entrepreneur in Nairobi, getting direct access to verified global capital was impossible. REACH changed that.",
    name: "Amara K.",
    title: "Founder, AgriTech startup",
    avatar: IMG.avatars[1],
  },
  {
    quote: "I found a Lead Web3 Developer role at a Series A Web3 protocol within 2 weeks of upgrading to Pro Talent on REACH.",
    name: "David L.",
    title: "Senior Smart Contract Engineer",
    avatar: IMG.avatars[2],
  },
];

const HERO_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1600&auto=format&fit=crop",
    caption: "Capital Allocators & Deal Pipelines",
  },
  {
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    caption: "High-Growth Tech Startup Builders",
  },
  {
    url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&auto=format&fit=crop",
    caption: "Web2 & Web3 Global Tech Talent",
  },
  {
    url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1600&auto=format&fit=crop",
    caption: "Cross-Border Horizons & Scale",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-slide Hero Background Images every 4.5s
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 4500);
    return () => clearInterval(heroTimer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-[#F5F3ED] overflow-x-hidden">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#C9A84C] focus:text-[#0A0A0F] focus:font-bold focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Navbar */}
      <nav
        aria-label="Main Navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0F0F1A]/95 backdrop-blur-md border-b border-[#3A3A52]" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-icon.png"
              alt="REACH Logo"
              width={36}
              height={36}
              className="w-9 h-9 rounded-lg object-contain"
              priority
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-wider text-[#F5F3ED]">
                R<span className="text-[#C9A84C]">EACH</span>
              </span>
              <span className="text-[8px] uppercase tracking-widest text-[#C9A84C] font-semibold -mt-1 hidden sm:block">
                Resources · Capital · Horizons
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works", "For investors", "For builders", "For talent"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-[#A8A6B8] hover:text-[#F5F3ED] transition focus-visible:outline focus-visible:outline-[#C9A84C] rounded"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/waitlist")}
              className="text-xs sm:text-sm text-[#C9A84C] font-semibold border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-1.5 rounded-lg hover:bg-[#C9A84C]/20 transition cursor-pointer"
            >
              Join Waitlist
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="hidden sm:block text-sm text-[#A8A6B8] hover:text-[#F5F3ED] transition px-3 py-1.5 cursor-pointer"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition shadow-lg shadow-[#C9A84C]/20 cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Landmark */}
      <main id="main-content">
        {/* Hero — Animated 4-Image Fading Carousel Background */}
        <section className="relative min-h-screen flex flex-col items-center justify-end px-4 sm:px-6 pb-16 sm:pb-20 text-center overflow-hidden">
          
          {/* Animated Background Slide Stack (Next.js AVIF/WebP Optimized) */}
          <div className="absolute inset-0 overflow-hidden">
            {HERO_IMAGES.map((img, i) => (
              <div
                key={img.url}
                className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out transform ${
                  i === currentHeroIdx
                    ? "opacity-100 scale-105"
                    : "opacity-0 scale-100 pointer-events-none"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.caption}
                  fill
                  sizes="100vw"
                  quality={75}
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="object-cover"
                />
              </div>
            ))}
          </div>

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(15,15,26,0.55) 0%, rgba(15,15,26,0.75) 55%, #0F0F1A 96%)",
          }}
        />
        <div
          className="absolute inset-0 mix-blend-color"
          style={{ backgroundColor: "#1A1A2E" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 30%, rgba(201,168,76,0.18), transparent 60%)" }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-3xl">

          {/* Waitlist Badge in Hero */}
          <button
            onClick={() => router.push("/waitlist")}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/35 text-[#C9A84C] text-xs font-bold mb-4 hover:bg-[#C9A84C]/25 transition cursor-pointer backdrop-blur-md"
          >
            <Sparkles size={13} />
            <span>Apply for REACH Private Beta · Priority Access Open →</span>
          </button>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
            Empowering Entrepreneurs.{" "}
            <span className="text-[#C9A84C] block sm:inline">Expanding Horizons.</span>
          </h1>

          <p className="text-[#D8D6E8] text-sm sm:text-base md:text-lg max-w-xl mb-8 sm:mb-10 leading-relaxed">
            A global, verified ecosystem connecting Resources, Entrepreneurs, Access, Capital, Horizons, and Talent across borders.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push("/waitlist")}
              className="flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-bold text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition cursor-pointer shadow-xl shadow-[#C9A84C]/25"
            >
              Join Private Beta Waitlist
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center justify-center gap-2 border border-[#F5F3ED40] text-[#F5F3ED] font-medium text-sm px-8 py-3.5 rounded-xl hover:bg-[#F5F3ED10] backdrop-blur transition cursor-pointer"
            >
              Start Exploring
            </button>
          </div>

          {/* Responsive Slide Indicator Controls */}
          <div className="flex items-center gap-2.5 mt-8 sm:mt-10">
            {HERO_IMAGES.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentHeroIdx(i)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 cursor-pointer ${
                  i === currentHeroIdx ? "w-8 sm:w-10 bg-[#C9A84C]" : "w-2 bg-white/30 hover:bg-white/60"
                }`}
                title={img.caption}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce z-10">
          <ChevronDown size={16} className="text-[#A8A6B8]" />
        </div>
      </section>

      {/* Stats — floating glass strip that overlaps the hero/next section seam */}
      <section className="relative z-20 -mt-10 px-6">
        <div className="max-w-5xl mx-auto bg-[#1A1A2E]/90 backdrop-blur-md border border-[#3A3A52] rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-8 px-8 py-8 shadow-2xl">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-medium text-[#C9A84C] mb-1">{s.value}</div>
              <div className="text-sm text-[#5C5A70]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* REACH Pillars Section — Explaining R · E · A · C · H */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-[11px] sm:text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            The R · E · A · C · H Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
            Built on Five Core <span className="text-[#C9A84C]">Pillars</span>
          </h2>
          <p className="text-[#A8A6B8] text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Our five-pillar ecosystem connects visionary entrepreneurs with institutional resources, direct access, capital allocators, and global horizons.
          </p>
        </div>

        {/* Responsive 5-card layout: 1 col on mobile, 2 col on tablet, 5 col on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {REACH_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.letter}
                className="group relative bg-gradient-to-b from-[#1A1A2E] to-[#121223] border border-[#3A3A52] hover:border-[#C9A84C]/60 p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#C9A84C]/10"
              >
                {/* Subtle top gold accent bar */}
                <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="w-12 h-12 rounded-xl bg-[#0F0F1A] border border-[#C9A84C]/30 flex items-center justify-center text-2xl font-black text-[#C9A84C] group-hover:scale-110 group-hover:border-[#C9A84C] shadow-lg shadow-black/40 transition-all">
                      {pillar.letter}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] group-hover:bg-[#C9A84C] group-hover:text-[#1A1A2E] transition-all duration-300">
                      <Icon size={18} />
                    </div>
                  </div>
                  
                  <h3 className="text-[#F5F3ED] text-lg font-heading font-bold mb-1 group-hover:text-[#C9A84C] transition-colors">
                    {pillar.name}
                  </h3>
                  <div className="text-[#C9A84C] text-[10px] font-bold uppercase tracking-wider mb-3">
                    {pillar.tagline}
                  </div>
                  <p className="text-[#A8A6B8] text-xs leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features — photographic bento grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 border-t border-[#3A3A52]/50">
        <div className="text-center mb-14">
          <div className="text-[#C9A84C] text-xs font-medium uppercase tracking-widest mb-3">
            Platform features
          </div>
          <h2 className="text-3xl font-medium mb-4">
            Everything you need to close deals
          </h2>
          <p className="text-[#A8A6B8] text-sm max-w-md mx-auto">
            Built for serious investors and ambitious entrepreneurs. No noise, no spam — just verified connections.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[190px] gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group relative rounded-2xl overflow-hidden border border-[#3A3A52] ${f.span}`}
              >
                <img
                  src={f.img}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(15,15,26,0.15) 0%, rgba(15,15,26,0.55) 60%, rgba(15,15,26,0.92) 100%)",
                  }}
                />
                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <div className="w-9 h-9 rounded-lg bg-[#C9A84C] flex items-center justify-center mb-3">
                    <Icon size={16} />
                  </div>
                  <h3 className="text-[#F5F3ED] text-sm font-medium mb-1.5">{f.title}</h3>
                  <p className="text-[#D8D6E8] text-xs leading-relaxed opacity-90">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works — sticky photo on one side, numbered timeline on the other */}
      <section id="how-it-works" className="bg-[#1A1A2E] border-y border-[#3A3A52]">
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-start">
          <div className="md:sticky md:top-24 rounded-2xl overflow-hidden border border-[#3A3A52] h-[420px]">
            <img src={IMG.flow} alt="" className="w-full h-full object-cover" />
          </div>

          <div>
            <div className="text-[#C9A84C] text-xs font-medium uppercase tracking-widest mb-3">
              How it works
            </div>
            <h2 className="text-3xl font-medium mb-4">
              From profile to closed deal
            </h2>
            <p className="text-[#A8A6B8] text-sm max-w-md mb-12">
              A structured four-step process that takes you from verified profile to signed agreement.
            </p>

            <div className="flex flex-col">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="relative flex gap-5 pb-10 last:pb-0">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute left-[19px] top-10 bottom-0 w-px bg-[#3A3A52]" />
                  )}
                  <div className="relative z-10 w-10 h-10 rounded-full bg-[#0F0F1A] border border-[#C9A84C] text-[#C9A84C] flex items-center justify-center text-xs font-bold shrink-0">
                    {step.step}
                  </div>
                  <div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mb-2 ${
                      step.role === "Investor"
                        ? "bg-blue-900/30 text-blue-400 border-blue-800"
                        : step.role === "Both"
                        ? "bg-[#C9A84C10] text-[#C9A84C] border-[#C9A84C30]"
                        : "bg-emerald-900/30 text-emerald-400 border-emerald-800"
                    }`}>
                      {step.role}
                    </span>
                    <h3 className="text-[#F5F3ED] text-base font-medium mb-1.5">{step.title}</h3>
                    <p className="text-[#5C5A70] text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For investors / For builders / For talent — full-width photographic split bands */}
      <section className="max-w-6xl mx-auto px-6 py-24 flex flex-col gap-6">

        <div id="for-investors" className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[#3A3A52]">
          <div className="relative h-64 md:h-auto">
            <img src={IMG.investors} alt="Investor ecosystem" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1A1A2E] via-transparent to-transparent" />
          </div>
          <div className="bg-[#1A1A2E] p-8 md:p-10 flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-900/30 flex items-center justify-center mb-5">
              <TrendingUp size={18} className="text-blue-400" />
            </div>
            <div className="text-blue-400 text-xs font-medium uppercase tracking-widest mb-3">
              For investors
            </div>
            <h3 className="text-[#F5F3ED] text-xl font-heading font-medium mb-4">
              Find deals that match your thesis
            </h3>
            <p className="text-[#A8A6B8] text-sm leading-relaxed mb-6">
              Stop sifting through unverified pitch decks. REACH surfaces verified startups matched to your exact investment criteria.
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {[
                "AI-scored project recommendations",
                "Verified founder identities",
                "Deal pipeline from NDA to close",
                "Portfolio analytics dashboard",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                  <CheckCircle size={13} className="text-blue-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/onboarding")}
              className="self-start flex items-center gap-2 border border-blue-700 text-blue-400 text-sm px-5 py-2.5 rounded-lg hover:bg-blue-900/20 transition cursor-pointer"
            >
              Join as investor <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        <div id="for-builders" className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[#3A3A52]">
          <div className="bg-[#1A1A2E] p-8 md:p-10 flex flex-col justify-center md:order-1 order-2">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C10] flex items-center justify-center mb-5">
              <Zap size={18} className="text-[#C9A84C]" />
            </div>
            <div className="text-[#C9A84C] text-xs font-medium uppercase tracking-widest mb-3">
              For entrepreneurs & builders
            </div>
            <h3 className="text-[#F5F3ED] text-xl font-heading font-medium mb-4">
              Raise capital & build your core team
            </h3>
            <p className="text-[#A8A6B8] text-sm leading-relaxed mb-6">
              Upload your project, set your funding goal, post job openings, and get discovered by global investors and top talent.
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {[
                "Project listing with banner and workspace",
                "Real-time investor interest tracking",
                "Post Web2 & Web3 job vacancies",
                "Funding progress bar and milestones",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                  <CheckCircle size={13} className="text-[#C9A84C] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/onboarding")}
              className="self-start flex items-center gap-2 bg-[#C9A84C] text-[#1A1A2E] text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition cursor-pointer"
            >
              List your startup <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="relative h-64 md:h-auto md:order-2 order-1">
            <img src={IMG.builders} alt="Builder ecosystem" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-[#1A1A2E] via-transparent to-transparent" />
          </div>
        </div>

        <div id="for-talent" className="grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[#3A3A52]">
          <div className="relative h-64 md:h-auto">
            <img src={IMG.talent} alt="Talent & Careers" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#1A1A2E] via-transparent to-transparent" />
          </div>
          <div className="bg-[#1A1A2E] p-8 md:p-10 flex flex-col justify-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/30 flex items-center justify-center mb-5">
              <Briefcase size={18} className="text-emerald-400" />
            </div>
            <div className="text-emerald-400 text-xs font-medium uppercase tracking-widest mb-3">
              For talent & job seekers
            </div>
            <h3 className="text-[#F5F3ED] text-xl font-heading font-medium mb-4">
              Land high-impact global tech roles
            </h3>
            <p className="text-[#A8A6B8] text-sm leading-relaxed mb-6">
              Discover verified Web2 & Web3 career opportunities, apply directly to funded startups, and stand out with Pro talent verification.
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {[
                "24h early access to new job listings (Pro)",
                "Direct messaging with hiring managers",
                "Verified talent profile & skill tags",
                "Application tracker & status notifications",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#A8A6B8]">
                  <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/auth/signup")}
              className="self-start flex items-center gap-2 border border-emerald-700 text-emerald-400 text-sm px-5 py-2.5 rounded-lg hover:bg-emerald-900/20 transition cursor-pointer"
            >
              Explore job opportunities <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#1A1A2E] border-y border-[#3A3A52]">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <Quote size={28} className="text-[#C9A84C] mx-auto mb-8 opacity-60" />

          <div className="relative min-h-[180px] flex items-center justify-center">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${
                  i === activeTestimonial
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                <p className="text-[#F5F3ED] text-lg leading-relaxed mb-6 italic max-w-xl">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover border border-[#C9A84C40]"
                  />
                  <div className="text-left">
                    <div className="text-[#C9A84C] text-sm font-medium">{t.name}</div>
                    <div className="text-[#5C5A70] text-xs mt-0.5">{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-10">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`rounded-full transition-all ${
                  i === activeTestimonial ? "w-6 h-2 bg-[#C9A84C]" : "w-2 h-2 bg-[#3A3A52]"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-32 text-center overflow-hidden">
        <img src={IMG.cta} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #0F0F1A 0%, rgba(15,15,26,0.75) 40%, #0F0F1A 100%)" }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl font-medium mb-4">
            Ready to connect with the world?
          </h2>
          <p className="text-[#D8D6E8] text-sm mb-10 max-w-md mx-auto">
            Join thousands of verified investors and entrepreneurs already using REACH to close deals across borders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1A1A2E] font-medium text-sm px-8 py-3.5 rounded-xl hover:opacity-90 transition"
              style={{ boxShadow: "0 8px 32px rgba(201, 168, 76, 0.25)" }}
            >
              Create free account
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center justify-center border border-[#F5F3ED40] text-[#F5F3ED] font-medium text-sm px-8 py-3.5 rounded-xl hover:bg-[#F5F3ED10] backdrop-blur transition"
            >
              Log in
            </button>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#3A3A52] bg-[#0F0F1A]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo-icon.png"
                  alt="REACH Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded object-contain"
                />
                <span className="text-lg font-bold tracking-wider text-[#F5F3ED]">
                  R<span className="text-[#C9A84C]">EACH</span>
                </span>
              </div>
              <p className="text-[#A8A6B8] text-xs leading-relaxed mb-2 font-medium">
                Resources · Entrepreneurs · Access · Capital · Horizons
              </p>
              <p className="text-[#5C5A70] text-xs leading-relaxed">
                Empowering Entrepreneurs.<br />Unlocking Global Horizons.
              </p>
            </div>
            <div>
              <div className="text-[#F5F3ED] text-xs font-medium uppercase tracking-wider mb-4">Platform</div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => router.push("/waitlist")}
                  className="text-[#5C5A70] text-xs hover:text-[#A8A6B8] transition text-left cursor-pointer"
                >
                  Private Beta Waitlist
                </button>
                {["Explore projects", "Find investors", "AI matches", "Community"].map((item) => (
                  <button
                    key={item}
                    onClick={() => router.push("/auth/login")}
                    className="text-[#5C5A70] text-xs hover:text-[#A8A6B8] transition text-left cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[#F5F3ED] text-xs font-medium uppercase tracking-wider mb-4">Company</div>
              <div className="flex flex-col gap-2">
                {["About REACH", "Blog", "Careers", "Press"].map((item) => (
                  <span key={item} className="text-[#5C5A70] text-xs">{item}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[#F5F3ED] text-xs font-medium uppercase tracking-wider mb-4">Legal</div>
              <div className="flex flex-col gap-2">
                {["Privacy policy", "Terms of service", "Cookie policy", "Compliance"].map((item) => (
                  <span key={item} className="text-[#5C5A70] text-xs">{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#3A3A52] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#5C5A70] text-xs">
              © 2026 REACH. All rights reserved. Resources · Entrepreneurs · Access · Capital · Horizons
            </p>
            <div className="flex items-center gap-4">
              {["Twitter", "LinkedIn", "Discord"].map((s) => (
                <span key={s} className="text-[#5C5A70] text-xs hover:text-[#A8A6B8] cursor-pointer transition">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
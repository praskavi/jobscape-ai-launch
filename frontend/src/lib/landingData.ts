import { Upload, Search, Gauge, Sparkles, History, Wallet, Check } from "lucide-react";

export const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const features = [
  { icon: Upload, title: "Resume Upload", desc: "Upload PDF or Word resumes and create a reusable resume profile." },
  { icon: Search, title: "Smart Job Search", desc: "Search jobs by keyword, location, role type, and source." },
  { icon: Gauge, title: "Rule-Based Pre-Scoring", desc: "Quickly compare resume skills against job descriptions before using AI." },
  { icon: Sparkles, title: "AI ATS Scoring", desc: "Get deeper scoring, summaries, and suggestions for selected roles." },
  { icon: History, title: "Search History", desc: "Track previous searches and matched jobs from your dashboard." },
  { icon: Wallet, title: "Cost-Controlled AI", desc: "Use rule-based filtering first so AI scoring is only used where it matters." },
];

export const steps = [
  { n: "01", title: "Upload Resume", desc: "Drop in your PDF or Word resume - we extract skills automatically.", icon: Upload },
  { n: "02", title: "Search Jobs", desc: "Pull live listings by keyword, location and source.", icon: Search },
  { n: "03", title: "Compare Match Scores", desc: "See rule-based and AI scores side by side.", icon: Gauge },
  { n: "04", title: "Apply With Confidence", desc: "Spend time only on roles where you actually fit.", icon: Check },
];

export const tiers = [
  {
    name: "Free", price: "$0", blurb: "For getting started", cta: "Start Free", highlight: false,
    features: ["Unlimited job search", "1 active resume", "3 ATS checks / month", "Basic dashboard"]
  },
  {
    name: "Basic", price: "$19", blurb: "For active job seekers", cta: "Start Basic", highlight: true,
    features: ["Unlimited job search", "1 active resume", "10 ATS checks / month", "20 AI job matches / month", "10 resume enhancements / month", "10 cover letters / month", "Top 10 premium recommendations"]
  },
  {
    name: "Premium", price: "$49", blurb: "For power users", cta: "Start Premium", highlight: false,
    features: ["Unlimited job search", "3 active resumes", "60 ATS checks / month", "50 AI job matches / month", "30 resume enhancements / month", "20 cover letters / month", "Top 20 premium recommendations"]
  },
];

export const testimonials = [
  { q: "I stopped applying randomly and focused only on jobs where my resume had a real chance.", n: "Aarav S.", r: "Software Engineer" },
  { q: "The match score helped me understand which skills I needed to add.", n: "Mei L.", r: "Business Analyst" },
  { q: "Great tool for quickly filtering job listings before applying.", n: "Daniel K.", r: "Data Analyst" },
];

export const faqs = [
  { q: "What is Jobscape AI?", a: "Jobscape AI is an AI-powered job search and resume matching platform that helps you find roles where you actually have a strong fit." },
  { q: "Do I need to upload a resume?", a: "Yes - uploading at least one resume lets us extract your skills and produce accurate match scores against live job listings." },
  { q: "How does the match score work?", a: "We combine rule-based comparison (skills, title relevance, missing requirements) with optional AI ATS scoring for deeper analysis." },
  { q: "Does it apply to jobs automatically?", a: "No. Jobscape AI helps you decide which jobs to apply for. You stay in control of every application." },
  { q: "Can I connect this to Supabase later?", a: "Yes. The frontend is structured so authentication and data can be wired into Supabase (or Lovable Cloud) without rewrites." },
  { q: "Can AI scoring be controlled to reduce cost?", a: "Absolutely. Rule-based filtering runs first, so AI ATS scoring is only spent on the jobs you actually want to evaluate." },
];

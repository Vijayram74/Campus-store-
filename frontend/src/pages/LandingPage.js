import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Laptop, Sofa, Shirt, Dumbbell, Music, 
  Refrigerator, Package, ShieldCheck, Users, Repeat, 
  CreditCard, Clock, ChevronDown, ChevronUp, ArrowRight,
  Star, MapPin, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';

const HERO_IMAGE = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80";
const CAMPUS_IMAGE = "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Campus Verified",
    description: "Only verified students from your college can access listings"
  },
  {
    icon: Repeat,
    title: "Buy or Borrow",
    description: "Choose to buy items outright or rent them for a specific period"
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Protected transactions with deposit holding for rentals"
  },
  {
    icon: Users,
    title: "Trusted Community",
    description: "Build trust through ratings and reviews from fellow students"
  }
];

const HOW_IT_WORKS_BUY = [
  { step: 1, title: "Browse Items", description: "Find what you need from campus listings" },
  { step: 2, title: "Make Purchase", description: "Pay securely through our platform" },
  { step: 3, title: "Meet & Collect", description: "Arrange pickup with the seller on campus" }
];

const HOW_IT_WORKS_BORROW = [
  { step: 1, title: "Find & Request", description: "Browse items available for rent" },
  { step: 2, title: "Pay + Deposit", description: "Rental fee plus refundable security deposit" },
  { step: 3, title: "Use & Return", description: "Return on time, get your deposit back" }
];

const FAQS = [
  {
    q: "Who can use Campus Store?",
    a: "Only verified students with a valid college email and student ID can sign up. Each campus is isolated - you can only buy/borrow from students at your own college."
  },
  {
    q: "How does borrowing work?",
    a: "When you borrow an item, you pay the rental fee plus a security deposit. The deposit is held by Campus Store (not the lender) and refunded when you return the item in good condition."
  },
  {
    q: "What if an item is damaged?",
    a: "If there's damage, the lender can file a claim. Our team reviews disputes and determines fair deductions from the deposit if needed."
  },
  {
    q: "How do payments work?",
    a: "All payments are processed securely through Stripe. For purchases, the seller receives payment after successful handoff. For rentals, the deposit is held and refunded upon return."
  },
  {
    q: "Can I list items for both buying and borrowing?",
    a: "Yes! When creating a listing, you can choose to make your item available for purchase only, borrowing only, or both options."
  }
];

const CATEGORIES = [
  { icon: BookOpen, name: "Textbooks", color: "bg-blue-50 text-blue-600" },
  { icon: Laptop, name: "Electronics", color: "bg-purple-50 text-purple-600" },
  { icon: Sofa, name: "Furniture", color: "bg-amber-50 text-amber-600" },
  { icon: Shirt, name: "Clothing", color: "bg-pink-50 text-pink-600" },
  { icon: Dumbbell, name: "Sports", color: "bg-emerald-50 text-emerald-600" },
  { icon: Music, name: "Instruments", color: "bg-indigo-50 text-indigo-600" },
  { icon: Refrigerator, name: "Appliances", color: "bg-cyan-50 text-cyan-600" },
  { icon: Package, name: "Other", color: "bg-slate-50 text-slate-600" }
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('buy');

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900">Campus Store</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" data-testid="login-btn">Log In</Button>
              </Link>
              <Link to="/signup">
                <Button className="btn-primary" data-testid="signup-btn">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 gradient-hero relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <span className="badge-verified">
                <CheckCircle className="w-3 h-3 mr-1" /> Campus Exclusive
              </span>
              <h1 className="hero-title mt-4">
                Buy & Borrow from Your Campus Community
              </h1>
              <p className="hero-subtitle">
                The trusted marketplace exclusively for college students. Buy second-hand items or borrow what you need — all within your campus.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <Link to="/signup">
                  <Button className="btn-primary text-lg px-8 py-3" data-testid="hero-signup-btn">
                    Join Your Campus <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" className="btn-secondary text-lg px-8 py-3" data-testid="learn-more-btn">
                    Learn More
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>4.9 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>10K+ Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>50+ Campuses</span>
                </div>
              </div>
            </div>
            <div className="relative animate-scale-in hidden lg:block">
              <img 
                src={HERO_IMAGE} 
                alt="Students on campus" 
                className="rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Verified Students Only</p>
                    <p className="text-sm text-slate-500">Safe campus community</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Popular Categories</h2>
          <p className="section-subtitle">Everything students need, all in one place</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {CATEGORIES.map((cat, index) => (
              <div 
                key={cat.name}
                className="category-card animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`category-${cat.name.toLowerCase()}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color}`}>
                  <cat.icon className="w-6 h-6" />
                </div>
                <span className="category-name">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Why Campus Store?</h2>
          <p className="section-subtitle">Built specifically for the college experience</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {FEATURES.map((feature, index) => (
              <div 
                key={feature.title}
                className="feature-card animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`feature-${index}`}
              >
                <div className="feature-icon">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-text">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Simple steps to buy or borrow</p>
          
          {/* Toggle */}
          <div className="flex justify-center mt-8">
            <div className="toggle-group">
              <button 
                className={`toggle-btn ${activeTab === 'buy' ? 'active buy' : ''}`}
                onClick={() => setActiveTab('buy')}
                data-testid="how-it-works-buy-tab"
              >
                Buy Items
              </button>
              <button 
                className={`toggle-btn ${activeTab === 'borrow' ? 'active borrow' : ''}`}
                onClick={() => setActiveTab('borrow')}
                data-testid="how-it-works-borrow-tab"
              >
                Borrow Items
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {(activeTab === 'buy' ? HOW_IT_WORKS_BUY : HOW_IT_WORKS_BORROW).map((step, index) => (
              <div 
                key={step.step}
                className="text-center animate-fade-in"
                data-testid={`step-${step.step}`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-white ${activeTab === 'buy' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mt-4">{step.title}</h3>
                <p className="text-slate-600 mt-2">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Trust & Safety First</h2>
              <p className="text-slate-300 mt-4 text-lg">
                Every user is verified with their college email and student ID. 
                You only interact with fellow students from your own campus.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "College email verification required",
                  "Student ID proof for all accounts",
                  "Deposits held securely by platform",
                  "24/7 dispute resolution support"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden lg:block">
              <img 
                src={CAMPUS_IMAGE}
                alt="Campus building"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="mt-10 divide-y divide-slate-100">
            {FAQS.map((faq, index) => (
              <div key={index} className="faq-item" data-testid={`faq-${index}`}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  {faq.q}
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {openFaq === index && (
                  <p className="faq-answer animate-fade-in">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 gradient-hero">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Ready to Join Your Campus Marketplace?
          </h2>
          <p className="text-lg text-slate-600 mt-4">
            Start buying, selling, and borrowing with fellow students today.
          </p>
          <Link to="/signup">
            <Button className="btn-primary text-lg px-10 py-4 mt-8" data-testid="cta-signup-btn">
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Campus Store</span>
            </div>
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Campus Store. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

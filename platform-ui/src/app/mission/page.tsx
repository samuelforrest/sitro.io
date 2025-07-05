'use client'

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Mail,
  ArrowRight,
  Target,
  Heart,
  Globe,
  Users,
  Lightbulb,
  Rocket
} from "lucide-react";
import { FaTwitter, FaGithub, FaLinkedin } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function Mission() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleGetStarted = () => {
    router.push('/#pricing');
  };

  const handleMobileNavigation = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation - Same as main page */}
      <nav className="sticky top-0 z-50 px-6 py-4 backdrop-blur-md border-b bg-white/80 border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <Image 
                src="/juxalogo.png" 
                alt="Juxa.io Logo" 
                width={40} 
                height={40} 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sitro.ai
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => router.push('/#pricing')} 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Pricing
            </button>
            <button 
              onClick={() => router.push('/#faq')} 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              FAQ
            </button>
            <button 
              onClick={() => router.push('/#testimonials')} 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Reviews
            </button>
            <button 
              className="font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Our Mission
            </button>
            
            <Button 
              className="nav-button bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 shadow-lg px-4 py-1"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
            <Button className="nav-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg px-4 py-1" onClick={handleGetStarted}>
              Get Started
            </Button>
          </div>
          
          <button 
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-gray-100" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className={`w-full h-0.5 bg-gray-900 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
              <div className={`w-full h-0.5 bg-gray-900 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
              <div className={`w-full h-0.5 bg-gray-900 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
            </div>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 p-4 rounded-lg bg-gray-50">
            <div className="flex flex-col space-y-4">
              <button onClick={() => handleMobileNavigation(() => router.push('/#pricing'))} className="text-left hover:text-blue-600 transition-colors">Pricing</button>
              <button onClick={() => handleMobileNavigation(() => router.push('/#faq'))} className="text-left hover:text-blue-600 transition-colors">FAQ</button>
              <button onClick={() => handleMobileNavigation(() => router.push('/#testimonials'))} className="text-left hover:text-blue-600 transition-colors">Reviews</button>
              <button onClick={() => setIsMenuOpen(false)} className="text-left text-blue-600 font-semibold">Our Mission</button>

              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Button 
                  className="w-full bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 shadow-lg"
                  onClick={() => handleMobileNavigation(() => router.push('/login'))}
                >
                  Sign In
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
                  onClick={() => handleMobileNavigation(handleGetStarted)}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mission Hero Section */}
      <section className="px-6 py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 rounded-full px-6 py-2 mb-8 border bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white transition-all duration-300 transform hover:scale-105">
            <Target className="w-4 h-4" />
            <span className="font-semibold text-sm">Our Mission</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight tracking-tight">
            Democratizing
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent block mt-2">
              Web Creation
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed font-medium text-gray-600">
            We believe everyone deserves a professional online presence, regardless of technical skill or budget.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                Why We Built
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                  Sitro.ai
                </span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                In today&apos;s digital world, having a professional website shouldn&apos;t be a luxury reserved for those with coding skills or large budgets. We saw talented entrepreneurs, artists, and small business owners struggling with expensive developers or spending countless hours on complex website builders.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                That&apos;s why we created Sitro.ai - to bridge the gap between vision and reality, making professional web design accessible to everyone through the power of artificial intelligence.
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center mb-4">
                  <Lightbulb className="w-8 h-8 mr-3" />
                  <h3 className="text-xl font-bold">Our Vision</h3>
                </div>
                <p className="text-blue-100 leading-relaxed">
                  A world where anyone can bring their digital ideas to life in seconds, not weeks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="px-6 py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Our Core Values
            </h2>
            <p className="text-xl max-w-3xl mx-auto font-medium text-gray-600">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Accessibility First</h3>
              <p className="text-gray-600 leading-relaxed">
                Technology should empower everyone, not exclude anyone. We design for inclusivity and ease of use.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Innovation</h3>
              <p className="text-gray-600 leading-relaxed">
                We push the boundaries of what&apos;s possible with AI, constantly improving and evolving our technology.
              </p>
            </div>

            <div className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4">Quality</h3>
              <p className="text-gray-600 leading-relaxed">
                Every website we generate meets professional standards. No compromises on design or performance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Impact */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Our Impact So Far
          </h2>
          <p className="text-xl mb-16 max-w-3xl mx-auto font-medium text-gray-600">
            Real numbers from real people building their dreams
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-blue-600 mb-2">50K+</div>
              <div className="text-gray-600 font-medium">Websites Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-purple-600 mb-2">30K+</div>
              <div className="text-gray-600 font-medium">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-emerald-600 mb-2">95%</div>
              <div className="text-gray-600 font-medium">Satisfaction Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-black text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600 font-medium">Support Available</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
            <Globe className="w-16 h-16 mx-auto mb-6 text-blue-200" />
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Making the Web More Inclusive
            </h3>
            <p className="text-lg md:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Every website we help create is one more voice added to the global conversation. 
              We&apos;re proud to be part of democratizing digital presence for creators worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="px-6 py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Join Our Mission
          </h2>
          <p className="text-xl mb-12 font-medium text-gray-600">
            Help us build a more inclusive web, one website at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold" 
              onClick={handleGetStarted}
            >
              Start Building Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-bold"
              onClick={() => router.push('/')}
            >
              Explore Features
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Same as main page */}
      <footer id="contact" className="px-6 py-12 bg-black text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Juxa.io</span>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                The fastest way to create professional landing pages. AI-powered, no coding required.
              </p>
              <div className="flex space-x-4">
                <a 
                  href="https://twitter.com/juxaio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors transform hover:scale-110"
                  aria-label="Follow us on Twitter"
                >
                  <FaTwitter className="w-6 h-6" />
                </a>
                <a 
                  href="https://github.com/juxaio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors transform hover:scale-110"
                  aria-label="Visit our GitHub"
                >
                  <FaGithub className="w-6 h-6" />
                </a>
                <a 
                  href="https://linkedin.com/company/juxaio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors transform hover:scale-110"
                  aria-label="Connect on LinkedIn"
                >
                  <FaLinkedin className="w-6 h-6" />
                </a>
                <a 
                  href="mailto:support@juxa.io" 
                  className="text-gray-300 hover:text-white transition-colors transform hover:scale-110"
                  aria-label="Send us an email"
                >
                  <Mail className="w-6 h-6" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Examples</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="text-gray-300 text-sm mb-4 md:mb-0">
              © 2025 Juxa.io. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm text-gray-300">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

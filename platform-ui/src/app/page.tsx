
'use client'

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TestimonialCard } from "@/components/testimonial-card";
import { testimonialsData } from "@/components/testimonials-data";
import { 
  ArrowRight, 
  Zap, 
  Globe, 
  Palette, 
  Crown, 
  Check, 
  Sparkles, 
  Send, 
  Star,
  Clock,
  Shield,
  Mail
} from "lucide-react";
import { FaTwitter, FaGithub, FaLinkedin } from "react-icons/fa";
import { useRouter } from "next/navigation";

interface GenerateResponse {
  id: string;
  status: string;
  message: string;
  code?: string;
}

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [heroTextIndex, setHeroTextIndex] = useState(0);
  const [heroCharIndex, setHeroCharIndex] = useState(0);
  const [isHeroDeleting, setIsHeroDeleting] = useState(false);
  const [promptCount, setPromptCount] = useState(100);
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState<boolean>(false);
  const [promptError, setPromptError] = useState<string>('');

  const heroTexts = useMemo(() => [
    "in 46 seconds",
    "zero cost", 
    "no coding",
    "customizable"
  ], []);
  
  const calculatePrice = useMemo(() => {
    if (promptCount <= 50) return 0;
    if (promptCount <= 250) return 12;
    if (promptCount <= 500) return 22;
    if (promptCount <= 1000) return 39;
    return Math.floor(promptCount * 0.05);
  }, [promptCount]);
  
  const carouselStyles = useMemo(() => `
    @keyframes scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-50%);
      }
    }
  `, []);

  const placeholderPrompts = useMemo(() => [
    "A vibrant portfolio website for my photography business with galleries...",
    "A smart restaurant website with menu, social and contact info...",
    "An inspiring tech startup landing page with features and pricing...",
    "A sleek, dark waitlist website for my next project...",
    "A law firm website with services and attorney profiles..."
  ], []);

  useEffect(() => {
    // Inject the custom styles
    const style = document.createElement('style');
    style.textContent = carouselStyles;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [carouselStyles]);

  useEffect(() => {
    const currentText = heroTexts[heroTextIndex];
    
    const timeout = setTimeout(() => {
      if (isHeroDeleting) {
        setTypedText(currentText.substring(0, heroCharIndex - 1));
        setHeroCharIndex(heroCharIndex - 1);
        
        if (heroCharIndex === 0) {
          setIsHeroDeleting(false);
          setHeroTextIndex((heroTextIndex + 1) % heroTexts.length);
        }
      } else {
        setTypedText(currentText.substring(0, heroCharIndex + 1));
        setHeroCharIndex(heroCharIndex + 1);
        
        if (heroCharIndex === currentText.length) {
          setTimeout(() => setIsHeroDeleting(true), 2000);
        }
      }
    }, isHeroDeleting ? 50 : 100);
    
    return () => clearTimeout(timeout);
  }, [heroCharIndex, isHeroDeleting, heroTextIndex, heroTexts]);

  useEffect(() => {
    const currentPrompt = placeholderPrompts[placeholderIndex];
    
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setPlaceholderText(currentPrompt.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        
        if (charIndex === 0) {
          setIsDeleting(false);
          setPlaceholderIndex((placeholderIndex + 1) % placeholderPrompts.length);
        }
      } else {
        setPlaceholderText(currentPrompt.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        
        if (charIndex === currentPrompt.length) {
          setTimeout(() => setIsDeleting(true), 1000);
        }
      }
    }, isDeleting ? 25 : 45);
    
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, placeholderIndex, placeholderPrompts]);

  const handleQuickCreate = async () => {
    if (!promptText.trim()) {
      setPromptError('Please enter a description for your website.');
      return;
    }

    setIsSubmittingPrompt(true);
    setPromptError('');

    try {
      const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      if (!backendApiUrl) {
        throw new Error('Backend API URL is not configured. Please set NEXT_PUBLIC_BACKEND_API_URL in .env.local and redeploy.');
      }

      const response = await fetch(backendApiUrl + '/generate-and-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error: ${response.status} - ${errorData.error || 'Unknown error during backend processing'}`);
      }

      const data: GenerateResponse = await response.json();
      
      router.push(`/wizard?id=${data.id}`);

    } catch (err: unknown) {
      console.error('Frontend encountered error during generation/deployment initiation:', err);
      if (err instanceof Error) {
        setPromptError(err.message);
      } else {
        setPromptError('An unexpected error occurred. Please try again.');
      }
      setIsSubmittingPrompt(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 80;
      const elementPosition = element.offsetTop - navHeight;
      
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    setIsMenuOpen(false);
  };

  const handleGetStarted = () => {
    scrollToSection('pricing');
  };

  const handleMobileNavigation = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };


  return (
    <div className="min-h-screen bg-white text-gray-900">
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
              Juxa.io
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('pricing')} 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('faq')} 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              FAQ
            </button>
            <button 
              onClick={() => scrollToSection('testimonials')} 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
            >
              Reviews
            </button>
            <button 
              className="font-medium text-gray-600 transition-colors hover:text-blue-600"
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
              <button onClick={() => scrollToSection('pricing')} className="text-left hover:text-blue-600 transition-colors">Pricing</button>
              <button onClick={() => scrollToSection('faq')} className="text-left hover:text-blue-600 transition-colors">FAQ</button>
              <button onClick={() => scrollToSection('testimonials')} className="text-left hover:text-blue-600 transition-colors">Reviews</button>
              <button onClick={() => setIsMenuOpen(false)} className="text-left hover:text-blue-600 transition-colors">Our Mission</button>

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

      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="hidden md:inline-flex items-center space-x-2 rounded-full px-6 py-2 mb-8 border bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white transition-all duration-300 transform hover:scale-105">
            <Crown className="w-4 h-4" />
            <span className="font-semibold text-sm">AI-Generated Landing Pages</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight tracking-tight animate-fade-in">
            AI-Generated websites
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent block mt-2">
              {typedText}
              <span className="animate-pulse">|</span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed font-medium text-gray-600">
            Professional landing pages for freelancers, professionals, entrepreneurs and businesses.
          </p>
          
          {/* Quick Create Prompt Box */}
          <div className="max-w-3xl mx-auto mb-12 transform hover:scale-105 transition-all duration-300">
            <div className="rounded-2xl shadow-2xl border p-8 backdrop-blur-sm bg-white/90 border-gray-200">
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Try me, no sign up needed.
              </h3>
              <div className="relative">
                <Input
                  placeholder={`${placeholderText}${!isDeleting && charIndex === placeholderPrompts[placeholderIndex]?.length ? '' : '|'}`}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full h-14 text-lg pr-16 rounded-xl border-2 bg-white border-gray-200 focus:border-blue-500 text-gray-900 placeholder:text-gray-500 transition-all duration-300 focus:scale-105"
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickCreate()}
                  disabled={isSubmittingPrompt}
                />
                <Button
                  onClick={handleQuickCreate}
                  disabled={!promptText.trim() || isSubmittingPrompt}
                  className="absolute right-2 top-2 h-10 w-10 min-h-10 min-w-10 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-colors duration-200"
                >
                  {isSubmittingPrompt ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
              {promptError && <p className="text-red-500 text-sm mt-3">{promptError}</p>}
              {isSubmittingPrompt && !promptError && (
                  <p className="text-sm mt-3 flex items-center justify-center text-blue-600">
                      <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                      Initiating generation... Redirecting soon.
                  </p>
              )}
              {!isSubmittingPrompt && !promptError && (
                  <p className="text-sm mt-3 flex items-center justify-center text-gray-500">
                      <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                      Your website will be ready in 46 seconds
                  </p>
              )}
            </div>
          </div>
          
          <div className="text-sm flex flex-wrap items-center justify-center gap-8 text-gray-500">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Live in 46 seconds</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Leading AI technology</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Why Choose Jymo.ai?
            </h2>
            <p className="hidden md:block text-xl max-w-3xl mx-auto font-medium text-gray-600">
              From lightning fast AI generation to smart SEO and security
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:hidden">
            <Card className="border-2 bg-white border-gray-100 hover:shadow-lg transition-all duration-300 rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold">AI Generation</h3>
              </CardContent>
            </Card>
            
            <Card className="border-2 bg-white border-gray-100 hover:shadow-lg transition-all duration-300 rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold">Designer Quality</h3>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white border-gray-100 hover:shadow-lg transition-all duration-300 rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold">Instant Publishing</h3>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white border-gray-100 hover:shadow-lg transition-all duration-300 rounded-xl">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-bold">Secure & Fast</h3>
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-2 bg-gradient-to-br from-blue-600 to-purple-700 text-white hover:shadow-2xl transition-all duration-300 rounded-2xl transform hover:scale-105 hover:-translate-y-2">
              <CardContent className="p-6 md:p-10">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Zap className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Lightning-Fast AI Generation</h3>
                    <p className="text-lg leading-relaxed text-blue-100 mb-4">
                      Our cutting-edge AI doesn&apos;t just create websites—it crafts experiences. From understanding your vision to incorporating your images, everything happens in under 30 seconds.
                    </p>
                    <div className="flex items-center text-white">
                      <Clock className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Average generation time: 46 seconds</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-2 bg-white border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 rounded-2xl transform hover:scale-105 hover:-translate-y-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">Designer-Quality Aesthetics</h3>
                <p className="leading-relaxed text-gray-600">
                  Our AI is capable of crafting websites better than the quality of top designers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300 rounded-2xl transform hover:scale-105 hover:-translate-y-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">One-Click Publishing</h3>
                <p className="leading-relaxed text-gray-600">
                  No hosting headaches, no domain setup stress. Your site goes live instantly after generation.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 rounded-2xl transform hover:scale-105 hover:-translate-y-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">Enterprise-Grade Security</h3>
                <p className="leading-relaxed text-gray-600">
                  Bank-level encryption, DDoS protection, and 99.9% uptime guarantee. Your business deserves bulletproof reliability.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white hover:shadow-xl transition-all duration-300 rounded-2xl transform hover:scale-105 hover:-translate-y-2">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">Smart SEO Optimization</h3>
                <p className="leading-relaxed text-white">
                  Built-in SEO magic that gets you ranking higher. Meta tags, structured data, and performance optimization—all automatic.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-blue-600 mb-2">50K+</div>
              <div className="text-gray-600 font-medium">Websites Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-purple-600 mb-2">46s</div>
              <div className="text-gray-600 font-medium">Average Build Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-emerald-600 mb-2">99.9%</div>
              <div className="text-gray-600 font-medium">Uptime Guarantee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600 font-medium">AI Support Available</div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="px-6 py-24 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loved by 50,000+ Creators
            </h2>
            <p className="text-xl max-w-3xl mx-auto font-medium text-gray-600">
              From freelancers to famous companies, see why everyone chooses Jymo.ai for their landing pages. Even we use it.
            </p>
          </div>
          
          <div className="relative -mx-6 overflow-hidden">
            <div className="px-6">
              <div className="flex space-x-4 md:space-x-6" style={{ animation: 'scroll 40s linear infinite' }} onMouseEnter={(e) => e.currentTarget.style.animationPlayState = 'paused'} onMouseLeave={(e) => e.currentTarget.style.animationPlayState = 'running'}>
                {/* First set of testimonials */}
                {testimonialsData.map((testimonial, index) => (
                  <TestimonialCard key={`first-${index}`} {...testimonial} index={index} />
                ))}
                {/* Duplicate set for seamless infinite loop */}
                {testimonialsData.map((testimonial, index) => (
                  <TestimonialCard key={`second-${index}`} {...testimonial} index={index + testimonialsData.length} />
                ))}
              </div>
              
              <div className="absolute top-0 left-0 w-24 md:w-40 h-full bg-gradient-to-r from-blue-50 via-blue-50/80 to-transparent pointer-events-none z-20"></div>
              <div className="absolute top-0 right-0 w-24 md:w-40 h-full bg-gradient-to-l from-purple-50 via-purple-50/80 to-transparent pointer-events-none z-20"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-6 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Simple Monthly Pricing
            </h2>
            <p className="text-xl font-medium text-gray-600">Start free, scale as you grow. Cancel anytime.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto pricing-cards-container">
            <Card className="pricing-card border-2 bg-white border-gray-200 rounded-2xl hover:shadow-xl hover:border-blue-300">
              <CardContent className="p-6 lg:p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Starter</h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-black">£0</span>
                    <span className="text-lg text-gray-500 ml-2">/month</span>
                  </div>
                  <p className="text-gray-600">Perfect for getting started</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    10 credits / day (monthly cap of 50)
                  </li>
                  <li className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Premium Templates
                  </li>
                  <li className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Jymo.ai subdomain (e.g. john-smith.jymo.ai)
                  </li>
                  <li className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    AI Support
                  </li>
                  <li className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    Image & Document Upload
                  </li>
                  <li className="flex items-center text-gray-700">
                    <Clock className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                    46-second creation
                  </li>
                </ul>
                
                <Button 
                  className="calculator-button w-full border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50 rounded-xl"
                  onClick={handleGetStarted}
                >
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
            
            <Card className="pricing-card bg-gradient-to-br from-blue-600 to-purple-600 text-white border-0 rounded-2xl shadow-2xl relative overflow-visible hover:shadow-3xl">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-yellow-400 text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  Most Popular
                </div>
              </div>
              <CardContent className="p-6 lg:p-8 pt-8 lg:pt-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-black">£9</span>
                    <span className="text-lg text-blue-200 ml-2">/month</span>
                  </div>
                  <p className="text-blue-100">For growing businesses</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    250 credits / month
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Everything in Starter
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Custom domains
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Code export
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Priority Human Support
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Advanced analytics
                  </li>
                </ul>
                
                <Button 
                  className="pro-button w-full bg-white text-blue-600 hover:bg-gray-50 rounded-xl font-bold" 
                  onClick={handleGetStarted}
                >
                  Start Pro Trial
                </Button>
              </CardContent>
            </Card>

            <Card className="pricing-card border-2 bg-gradient-to-br from-gray-900 to-gray-800 text-white border-gray-700 rounded-2xl shadow-xl relative overflow-visible hover:shadow-2xl">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  Enterprise
                </div>
              </div>
              <CardContent className="p-6 lg:p-8 pt-8 lg:pt-10">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Business</h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-5xl font-black">£29</span>
                    <span className="text-lg text-gray-300 ml-2">/month</span>
                  </div>
                  <p className="text-gray-300">For teams and agencies</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center">
                    <Crown className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    1000 credits / month
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Everything in Pro
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    API access & integrations
                  </li>
                    <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Highest Speed
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                    Guaranteed Human Support
                  </li>
                </ul>
                
                <Button 
                  className="calculator-button w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold" 
                  onClick={handleGetStarted}
                >
                  Start Business Plan
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500 text-sm">
              No setup fees. Cancel anytime. 80% of AI prompts use 1 credit*
            </p>
          </div>

          <div className="max-w-2xl mx-auto mt-16">
            <Card className="border-2 border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Custom Plan Calculator
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of credits per month: {promptCount}
                  </label>
                  <input
                    type="range"
                    min="25"
                    max="2000"
                    step="25"
                    value={promptCount}
                    onChange={(e) => setPromptCount(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3B82F6 0%, #8B5CF6 ${((promptCount - 25) / (2000 - 25)) * 100}%, #E5E7EB ${((promptCount - 25) / (2000 - 25)) * 100}%, #E5E7EB 100%)`
                    }}
                  />
                </div>
                
                <div className="text-center">
                  <div className="flex items-baseline justify-center mb-4">
                    <span className="text-3xl font-black text-gray-900">£{calculatePrice}</span>
                    <span className="text-lg text-gray-500 ml-2">/month</span>
                  </div>
                  
                  <Button 
                    className="calculator-button w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold"
                    onClick={handleGetStarted}
                  >
                    {calculatePrice === 0 ? 'Get Started Free' : `Start ${promptCount <= 250 ? "Pro" : promptCount <= 1000 ? "Business" : "Enterprise"} Plan`}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            It&apos;s time to build that website <span className="text-4xl md:text-6xl text-white">😉</span>
          </h2>
          <p className="text-xl mb-12 font-medium text-gray-600">
            Join thousands of creators who trust Jymo.ai for their landing pages.
          </p>
          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="cta-button w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold" 
              onClick={handleGetStarted}
            >
              Start Free Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            <p className="text-xl font-medium text-gray-600">
              Everything you need to know about Jymo.ai
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">
                    How does the AI website generation work?
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    Our vigorously trained AI analyzes your prompt and instantly creates a complete website with professional design, optimized content, and responsive layouts. Simply describe your business or project, and our AI handles everything from color schemes to content structure in around 46 seconds.
                  </p>
                </div>
              </details>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">
                    Can I edit my website after it&apos;s generated?
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    Absolutely! You can make unlimited edits to your website using our intuitive editor. Pro users can also export the complete code to customize further or host elsewhere.
                  </p>
                </div>
              </details>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">
                    How do credits work?
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    Each credit allows you to generate or significantly modify a website. 85% of user prompts use just one credit. More complex prompts such as attaching images / documents will use more. Credits reset monthly and don&apos;t roll over (as of now 😉)
                  </p>
                </div>
              </details>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">
                    Can I use my own domain?
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    Yes! Pro and Business plans include custom domain support. Simply connect your existing domain or purchase one through our platform partners. We handle all the technical setup including SSL certificates for secure connections.
                  </p>
                </div>
              </details>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">
                    Is my website mobile-friendly?
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    Absolutely! Every website generated by our AI is fully responsive and optimized for all devices - desktop, tablet, and mobile. We also include automatic SEO optimization and fast loading speeds for better search rankings.
                  </p>
                </div>
              </details>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <details className="group">
                <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 pr-4">
                    What if I need help or support?
                  </h3>
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white transition-transform group-open:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    We offer 24/7 AI support for all users, priority human support for Pro users, and guaranteed human support for Business users. Our support team is knowledgeable and responds quickly to help you succeed.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="text-gray-600 mb-6">Still have questions?</p>
            <Button 
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl px-8 py-3 font-semibold transition-colors duration-200"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>

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
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
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
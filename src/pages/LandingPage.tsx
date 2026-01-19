import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LandingNavbar from '@/components/LandingNavbar';
import {
  GraduationCap,
  Shield,
  Coins,
  Trophy,
  BookOpen,
  FlaskConical,
  Zap,
  Users,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import cryptiqIllustration from '@/assets/cryptiq-learning-illustration.png';

const LandingPage = () => {
  const features = [
    {
      icon: BookOpen,
      title: 'Interactive Quizzes',
      description: 'Test your knowledge with engaging quizzes covering blockchain, smart contracts, and DeFi.'
    },
    {
      icon: FlaskConical,
      title: 'Hands-on Labs',
      description: 'Practice real-world scenarios with interactive labs and earn rewards for completion.'
    },
    {
      icon: Coins,
      title: 'Earn JIET Tokens',
      description: 'Get rewarded with JIET tokens for completing quizzes and labs. Real crypto rewards!'
    },
    {
      icon: Shield,
      title: 'Security Focused',
      description: 'Learn about blockchain security, smart contract auditing, and best practices.'
    }
  ];


  const howItWorks = [
    {
      step: '01',
      title: 'Create Account',
      description: 'Sign up for free and connect your Solana wallet to start earning.'
    },
    {
      step: '02',
      title: 'Learn & Practice',
      description: 'Complete quizzes and labs to build your blockchain knowledge.'
    },
    {
      step: '03',
      title: 'Earn Rewards',
      description: 'Get JIET tokens and XP for every completed challenge.'
    },
    {
      step: '04',
      title: 'Redeem & Grow',
      description: 'Use your tokens for rewards and climb the leaderboard.'
    }
  ];

  return (
    <div className="dark min-h-screen bg-background overflow-x-hidden">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6 sm:space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full text-accent text-sm">
                <Zap className="w-4 h-4" />
                <span>Learn Blockchain, Earn Crypto</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">
                Master{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  Blockchain
                </span>
                <br />
                Skills Today
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Interactive quizzes, hands-on labs, and real JIET token rewards. 
                The gamified way to learn Web3.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 text-lg px-8 py-6 w-full sm:w-auto">
                    Start Learning Free
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 w-full sm:w-auto border-muted-foreground/30 hover:bg-card">
                    Sign In
                  </Button>
                </Link>
              </div>

            </div>

            {/* Right Content - Illustration */}
            <div className="relative hidden lg:flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full blur-3xl" />
                <div className="relative w-96 h-96 xl:w-[450px] xl:h-[450px] rounded-full bg-card/50 backdrop-blur-sm border border-border/50 flex items-center justify-center">
                  <img
                    src={cryptiqIllustration}
                    alt="CryptIQ Learning Platform"
                    className="w-80 h-80 xl:w-96 xl:h-96 object-contain"
                  />
                </div>
                
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-card border border-border rounded-xl p-3 shadow-xl animate-bounce">
                  <Trophy className="w-8 h-8 text-accent" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-3 shadow-xl animate-bounce delay-500">
                  <Coins className="w-8 h-8 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-muted-foreground/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-accent rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Why Choose{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                CryptIQ?
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master blockchain technology and earn real rewards
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-accent/50 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-32 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              How It{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                Works
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start your blockchain learning journey in just 4 simple steps
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative text-center group">
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-accent/50 to-transparent" />
                )}
                
                <div className="relative z-10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Section */}
      <section id="rewards" className="py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Earn Real{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
                  JIET Tokens
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Every quiz you complete and every lab you master earns you JIET tokens. 
                Connect your Solana wallet and watch your balance grow as you learn.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Complete quizzes to earn 5-50 JIET per quiz',
                  'Master labs for 15+ JIET rewards',
                  'Climb the leaderboard for bonus rewards',
                  'Redeem tokens for exclusive perks'
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link to="/register">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 mt-4">
                  Start Earning Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10 rounded-3xl blur-3xl" />
              <Card className="relative bg-card/50 backdrop-blur-sm border-border/50 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Top Learners</h4>
                    <p className="text-sm text-muted-foreground">This Week</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { name: 'Alex M.', xp: '2,450 XP', rank: 1 },
                    { name: 'Sarah K.', xp: '2,180 XP', rank: 2 },
                    { name: 'James L.', xp: '1,920 XP', rank: 3 }
                  ].map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          user.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                          user.rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                          'bg-orange-500/20 text-orange-500'
                        }`}>
                          #{user.rank}
                        </div>
                        <span className="font-medium text-foreground">{user.name}</span>
                      </div>
                      <span className="text-accent font-semibold">{user.xp}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to Start Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary">
              Journey?
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of learners mastering blockchain technology and earning real rewards.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 text-lg px-10 py-6">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                Crypt<span className="font-normal">IQ</span>
              </span>
              <GraduationCap className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CryptIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

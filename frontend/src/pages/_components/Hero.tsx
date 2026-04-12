import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

function AnimatedCounter({ end, duration = 2, suffix = "" }: { end: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animateParams = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / (duration * 1000), 1);

      const easeOutCube = 1 - Math.pow(1 - percentage, 3);
      setCount(Math.floor(easeOutCube * end));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animateParams);
      }
    };

    animationFrame = requestAnimationFrame(animateParams);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      {/* Animated orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="hidden lg:block relative lg:col-span-5"
          >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative">
              {/* Left Edge Blend Gradient */}
              <div className="absolute inset-y-[10%] -left-[55%] w-64 bg-gradient-to-r from-background via-background/90 to-transparent z-10 pointer-events-none hidden xl:block" />
              
              <img 
                src="/assets/IITK.jpg" 
                alt="IIT Kanpur Campus" 
                className="relative w-[210%] max-w-none h-auto -left-[60%] transition-transform duration-700 drop-shadow-[0_35px_45px_rgba(0,0,0,0.8)] z-0"
              />
            </div>
          </motion.div>

          {/* Right Column: Hero Text */}
          <div className="relative z-20 text-center lg:text-left lg:col-span-7 lg:pl-20">
            {/* Headline */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-balance mb-6"
            >
              Never Miss a
              <span className="block bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                Campus Moment
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground/80 max-w-2xl mx-auto lg:mx-0 mb-10 text-balance font-medium"
            >
              Discover events from councils, clubs, and organizations.
              Engage with your campus community like never before.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10 lg:mb-0"
            >
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/20 rounded-full" asChild>
                <Link to="/feed">
                  Explore Events
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="gap-2 rounded-full" asChild>
                <a href="#features">Learn More</a>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Stripe-Style Stats Section */}
        <div className="mt-10 border-y border-border/40 py-16 w-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-4 max-w-5xl mx-auto w-full divide-y sm:divide-y-0 sm:divide-x divide-border/30"
          >
            <div className="text-center group flex flex-col items-center justify-center pt-8 sm:pt-0">
              <p className="text-5xl lg:text-6xl font-medium tracking-tight text-foreground/80 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:text-primary mb-3">
                <AnimatedCounter end={500} suffix="+" />
              </p>
              <p className="text-sm font-medium text-muted-foreground/70 transition-all duration-300 group-hover:text-foreground">
                Events Organized Yearly
              </p>
            </div>

            <div className="text-center group flex flex-col items-center justify-center pt-8 sm:pt-0">
              <p className="text-5xl lg:text-6xl font-medium tracking-tight text-foreground/80 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:text-primary mb-3">
                <AnimatedCounter end={10} suffix="K+" />
              </p>
              <p className="text-sm font-medium text-muted-foreground/70 transition-all duration-300 group-hover:text-foreground">
                Active Student Users
              </p>
            </div>

            <div className="text-center group flex flex-col items-center justify-center pt-8 sm:pt-0">
              <p className="text-5xl lg:text-6xl font-medium tracking-tight text-foreground/80 transition-all duration-500 ease-out group-hover:-translate-y-2 group-hover:text-primary mb-3">
                <AnimatedCounter end={50} suffix="+" />
              </p>
              <p className="text-sm font-medium text-muted-foreground/70 transition-all duration-300 group-hover:text-foreground">
                Campus Organizations
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

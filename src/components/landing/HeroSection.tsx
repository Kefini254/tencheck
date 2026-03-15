import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-scene.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="African landlord verifying tenants outside modern apartments in Kenya"
          className="w-full h-full object-cover"
          loading="eager" />
        
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
      </div>

      {/* Floating UI elements */}
      <motion.div
        className="absolute top-32 right-[15%] hidden lg:block glass-card rounded-xl p-4 animate-float"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}>
        
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">92</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tenant Score</p>
            <p className="text-sm font-semibold">Excellent</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-40 right-[10%] hidden lg:block glass-card rounded-xl p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        style={{ animation: "float 4s ease-in-out 1s infinite" }}>
        
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
            <Home className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">New Listing</p>
            <p className="text-sm font-semibold">3BR Kilimani</p>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="container relative mx-auto px-4 py-20">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}>
            
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6 mx-[33px]">
              🇰🇪 Built for Kenya's Rental Market. Rewiring rental ecosystem   
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 mx-[99px] py-[11px] px-[3px]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}>
            
            Know Your Tenant Before You Hand Over the{" "}
            <span className="text-gradient">Keys</span>
          </motion.h1>

          <motion.p
            className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-xl mx-[88px] py-[11px] px-[2px] sm:text-lg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}>
            
            TenCheck helps landlords verify tenant rent payment behavior and allows tenants to build a trusted rental reputation.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}>
            
            <Button size="lg" className="gap-2 text-base px-8" asChild>
              <Link to="/signup">
                <Search className="h-4 w-4" />
                Check Tenant
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 text-base px-8" asChild>
              <Link to="/properties">
                <Home className="h-4 w-4" />
                Find Houses
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>);

};

export default HeroSection;
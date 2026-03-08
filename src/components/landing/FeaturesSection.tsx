import { Shield, Receipt, Home, Scale } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Tenant Reputation Scoring",
    description: "Data-driven reliability scores help landlords make informed decisions about prospective tenants.",
  },
  {
    icon: Receipt,
    title: "Verified Payment Evidence",
    description: "M-Pesa SMS parsing automatically verifies rent payments and builds a trustworthy payment history.",
  },
  {
    icon: Home,
    title: "Rental Marketplace",
    description: "Browse and list verified rental properties across Kenya with detailed listings and direct enquiries.",
  },
  {
    icon: Scale,
    title: "Dispute Resolution",
    description: "Fair and transparent system for handling payment disputes between landlords and tenants.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium text-primary mb-2 block">Features</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Everything you need for trusted rentals
          </h2>
          <p className="text-muted-foreground text-lg">
            A complete platform connecting landlords and tenants with transparency and trust.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="glass-card rounded-2xl p-8 hover-lift"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-5">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

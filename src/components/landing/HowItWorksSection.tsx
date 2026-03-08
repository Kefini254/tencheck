import { motion } from "framer-motion";
import { Search, Upload, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Landlord checks tenant score",
    description: "Search by national ID or phone number to instantly view a tenant's reliability score and payment history.",
  },
  {
    icon: Upload,
    step: "02",
    title: "Tenant uploads payment proof",
    description: "Tenants submit M-Pesa SMS confirmations or screenshots as verified evidence of rent payments.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "System calculates reliability score",
    description: "Our algorithm processes payment data to generate a transparent, fair reliability score from 0 to 100.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-medium text-primary mb-2 block">How It Works</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Simple, transparent, and fair
          </h2>
          <p className="text-muted-foreground text-lg">
            Three easy steps to build and verify rental trust.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="h-20 w-20 rounded-2xl bg-accent flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <Shield className="h-5 w-5 text-primary" />
            TenCheck
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/properties" className="hover:text-foreground transition-colors">Properties</Link>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 TenCheck. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

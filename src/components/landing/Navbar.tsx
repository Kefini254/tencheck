import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import tenCheckLogo from "@/assets/tencheck-logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, profile } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={tenCheckLogo} alt="TenCheck" className="h-8 border-[#022213] border-2 border-solid rounded-full" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <Link to="/properties" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Find Houses</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ?
          <>
              <span className="text-muted-foreground mx-[11px] text-lg">{profile?.name || user.email}</span>
              <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
            </> :

          <>
              <Button variant="ghost" asChild><Link to="/login">Log In</Link></Button>
              <Button asChild><Link to="/signup">Get Started</Link></Button>
            </>
          }
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-border bg-background">
          
            <div className="container mx-auto p-4 flex flex-col gap-3">
              <a href="/#features" className="text-sm py-2" onClick={() => setOpen(false)}>Features</a>
              <a href="/#how-it-works" className="text-sm py-2" onClick={() => setOpen(false)}>How It Works</a>
              <Link to="/properties" className="text-sm py-2" onClick={() => setOpen(false)}>Find Houses</Link>
              <hr className="border-border" />
              {user ?
            <Button asChild><Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link></Button> :

            <>
                  <Button variant="ghost" asChild className="justify-start"><Link to="/login">Log In</Link></Button>
                  <Button asChild><Link to="/signup">Get Started</Link></Button>
                </>
            }
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </nav>);

};

export default Navbar;
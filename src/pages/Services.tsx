import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, MapPin, Star, Phone, Shield, ChevronDown,
  Truck, Sparkles, TreePine, Paintbrush, Wrench, Bug,
  Hammer, Droplets, Zap, Scissors, Package, Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const SERVICE_CATEGORIES = [
  "Relocation Assistance", "Furniture Moving", "House Cleaning", "Deep Cleaning",
  "Landscaping", "Lawn Mowing", "Hedge Trimming", "Tree Pruning",
  "Waste Removal", "Interior Painting", "Exterior Painting", "Carpentry",
  "Cabinet Installation", "Masonry", "Plumbing", "Electrical Repair",
  "Appliance Installation", "Curtain Installation", "Furniture Assembly",
  "Pest Control", "Roof Repair", "Window Repair", "Tile Installation",
  "Water Tank Cleaning", "Drain Unclogging", "General Handyman",
];

const CATEGORY_ICONS: Record<string, any> = {
  "Relocation Assistance": Truck,
  "Furniture Moving": Package,
  "House Cleaning": Sparkles,
  "Deep Cleaning": Sparkles,
  "Landscaping": TreePine,
  "Lawn Mowing": Scissors,
  "Interior Painting": Paintbrush,
  "Exterior Painting": Paintbrush,
  "Plumbing": Droplets,
  "Electrical Repair": Zap,
  "Carpentry": Hammer,
  "Pest Control": Bug,
  "General Handyman": Wrench,
};

const FEATURED_CATEGORIES = [
  { name: "House Cleaning", icon: Sparkles, color: "bg-blue-500/10 text-blue-600" },
  { name: "Plumbing", icon: Droplets, color: "bg-cyan-500/10 text-cyan-600" },
  { name: "Electrical Repair", icon: Zap, color: "bg-yellow-500/10 text-yellow-600" },
  { name: "Furniture Moving", icon: Truck, color: "bg-orange-500/10 text-orange-600" },
  { name: "Landscaping", icon: TreePine, color: "bg-primary/10 text-primary" },
  { name: "Interior Painting", icon: Paintbrush, color: "bg-purple-500/10 text-purple-600" },
  { name: "Carpentry", icon: Hammer, color: "bg-amber-500/10 text-amber-600" },
  { name: "Pest Control", icon: Bug, color: "bg-red-500/10 text-red-600" },
];

const Services = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: workers, isLoading } = useQuery({
    queryKey: ["service-workers", selectedCategory, locationFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("service_workers")
        .select("*, worker_endorsements(id, landlord_id, endorsement_notes)")
        .eq("verification_status", "verified")
        .eq("is_available", true)
        .order("rating", { ascending: false });

      if (selectedCategory) {
        query = query.eq("service_category", selectedCategory);
      }
      if (locationFilter) {
        query = query.ilike("location", `%${locationFilter}%`);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const filteredWorkers = workers?.filter(
    (w: any) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.service_category.toLowerCase().includes(search.toLowerCase()) ||
      w.location.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <Badge variant="secondary" className="mb-4 text-xs font-medium">
              <Shield className="h-3 w-3 mr-1" /> Landlord-Endorsed Workers
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Find Trusted Property Services{" "}
              <span className="text-gradient">Near You</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              TenCheck connects tenants and property owners with landlord-endorsed service workers.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workers or services..."
                  className="pl-10 border-0 bg-muted/50 focus-visible:ring-1"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Location..."
                  className="pl-10 border-0 bg-muted/50 focus-visible:ring-1"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
              <div className="relative">
                <select
                  className="flex h-10 w-full rounded-md bg-muted/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none pr-8 min-w-[180px]"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <h2 className="font-display font-bold text-xl text-foreground mb-6">Popular Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {FEATURED_CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? "" : cat.name)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    selectedCategory === cat.name
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg ${cat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-foreground text-center leading-tight">{cat.name}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Show all categories */}
          <AnimatePresence>
            {showAllCategories && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
                  {SERVICE_CATEGORIES.filter(
                    (c) => !FEATURED_CATEGORIES.some((fc) => fc.name === c)
                  ).map((cat) => {
                    const Icon = CATEGORY_ICONS[cat] || Wrench;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all duration-200 ${
                          selectedCategory === cat
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate text-foreground">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="gap-1 text-muted-foreground"
            >
              {showAllCategories ? "Show Less" : "View All Categories"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllCategories ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Workers Grid */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">
                {selectedCategory || "All"} Workers
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredWorkers.length} {filteredWorkers.length === 1 ? "worker" : "workers"} found
              </p>
            </div>
            {selectedCategory && (
              <Button variant="outline" size="sm" onClick={() => setSelectedCategory("")}>
                Clear Filter
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-display font-semibold text-foreground">No workers found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkers.map((worker: any, i: number) => (
                <WorkerCard key={worker.id} worker={worker} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

const WorkerCard = ({ worker, index }: { worker: any; index: number }) => {
  const Icon = CATEGORY_ICONS[worker.service_category] || Wrench;
  const endorsementCount = worker.worker_endorsements?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-foreground truncate">{worker.name}</h3>
            <p className="text-xs text-muted-foreground">{worker.service_category}</p>
          </div>
        </div>
        {endorsementCount > 0 && (
          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
            <Shield className="h-3 w-3" /> Endorsed
          </Badge>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{worker.location}</span>
        </div>
        {worker.rating > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
            <span>{Number(worker.rating).toFixed(1)} rating</span>
          </div>
        )}
        {worker.experience_years > 0 && (
          <p className="text-xs text-muted-foreground">
            {worker.experience_years} {worker.experience_years === 1 ? "year" : "years"} experience
          </p>
        )}
      </div>

      <a
        href={`tel:${worker.phone}`}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Phone className="h-4 w-4" />
        Contact
      </a>
    </motion.div>
  );
};

export default Services;

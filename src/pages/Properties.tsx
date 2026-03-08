import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, Bed, Bath, ArrowRight, Filter, X, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const ITEMS_PER_PAGE = 9;
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4];
const BATHROOM_OPTIONS = [0, 1, 2, 3];

const Properties = () => {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [rentRange, setRentRange] = useState<[number, number]>([0, 200000]);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: dbProperties, isLoading } = useQuery({
    queryKey: ["properties-browse"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*, landlords!inner(verification_status)")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const properties = dbProperties ?? [];

  const filtered = properties.filter((p: any) => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchesRent = p.rent_amount >= rentRange[0] && p.rent_amount <= rentRange[1];
    const matchesBedrooms = bedrooms === null || p.bedrooms === bedrooms;
    const matchesBathrooms = bathrooms === null || p.bathrooms === bathrooms;
    const matchesLocation =
      !locationFilter || p.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesRent && matchesBedrooms && matchesBathrooms && matchesLocation;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const clearFilters = () => {
    setRentRange([0, 200000]);
    setBedrooms(null);
    setBathrooms(null);
    setLocationFilter("");
    setPage(1);
  };

  const hasActiveFilters = rentRange[0] > 0 || rentRange[1] < 200000 || bedrooms !== null || bathrooms !== null || locationFilter;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3 text-foreground">Find Your Next Home</h1>
            <p className="text-muted-foreground text-lg mb-6">Browse verified rental properties across Kenya</p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, or location..."
                className="pl-10 pr-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-3.5 w-3.5" />
                Filters
                {hasActiveFilters && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearFilters}>
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "property" : "properties"} found
            </p>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</Label>
                    <Input
                      placeholder="e.g. Kilimani, Nairobi"
                      value={locationFilter}
                      onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rent: Ksh {rentRange[0].toLocaleString()} – {rentRange[1].toLocaleString()}
                    </Label>
                    <div className="pt-2">
                      <Slider
                        min={0}
                        max={200000}
                        step={5000}
                        value={rentRange}
                        onValueChange={(v) => { setRentRange(v as [number, number]); setPage(1); }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bedrooms</Label>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant={bedrooms === null ? "default" : "outline"}
                        className="text-xs px-2.5"
                        onClick={() => { setBedrooms(null); setPage(1); }}
                      >
                        Any
                      </Button>
                      {BEDROOM_OPTIONS.map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant={bedrooms === n ? "default" : "outline"}
                          className="text-xs px-2.5"
                          onClick={() => { setBedrooms(n); setPage(1); }}
                        >
                          {n === 0 ? "Studio" : n + "+"}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bathrooms</Label>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant={bathrooms === null ? "default" : "outline"}
                        className="text-xs px-2.5"
                        onClick={() => { setBathrooms(null); setPage(1); }}
                      >
                        Any
                      </Button>
                      {BATHROOM_OPTIONS.map((n) => (
                        <Button
                          key={n}
                          size="sm"
                          variant={bathrooms === n ? "default" : "outline"}
                          className="text-xs px-2.5"
                          onClick={() => { setBathrooms(n); setPage(1); }}
                        >
                          {n}+
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Properties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-display font-semibold text-foreground">No properties found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paged.map((property: any, i: number) => {
                const isVerifiedLandlord = property.landlords?.verification_status === "verified";
                return (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <Link
                      to={`/properties/${property.id}`}
                      className="group block glass-card rounded-2xl overflow-hidden hover-lift"
                    >
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img
                          src={property.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop"}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {isVerifiedLandlord && (
                          <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground gap-1">
                            <Shield className="h-3 w-3" /> Verified
                          </Badge>
                        )}
                        {property.images?.length > 1 && (
                          <span className="absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded-md bg-foreground/70 text-background backdrop-blur-sm">
                            {property.images.length} photos
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-display font-semibold text-lg mb-1 text-foreground">{property.title}</h3>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                          <MapPin className="h-3.5 w-3.5" />
                          {property.location}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {property.bedrooms} BR</span>
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {property.bathrooms} BA</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-lg text-foreground">
                            Ksh {property.rent_amount.toLocaleString()}
                            <span className="text-sm font-normal text-muted-foreground">/mo</span>
                          </span>
                          <span className="text-sm text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                            View <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-muted-foreground px-1">…</span>
                      )}
                      <Button
                        size="sm"
                        variant={p === currentPage ? "default" : "outline"}
                        className="w-9"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Properties;

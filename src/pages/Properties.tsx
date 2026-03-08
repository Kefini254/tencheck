import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Bed, Bath, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const sampleProperties = [
  { id: 1, title: "Modern 2BR Apartment", location: "Kilimani, Nairobi", rent: 35000, bedrooms: 2, bathrooms: 1, image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop" },
  { id: 2, title: "Spacious 3BR Flat", location: "Westlands, Nairobi", rent: 55000, bedrooms: 3, bathrooms: 2, image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop" },
  { id: 3, title: "Cozy Studio", location: "South B, Nairobi", rent: 18000, bedrooms: 1, bathrooms: 1, image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop" },
  { id: 4, title: "Executive 4BR Villa", location: "Karen, Nairobi", rent: 120000, bedrooms: 4, bathrooms: 3, image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop" },
  { id: 5, title: "2BR with Garden", location: "Lavington, Nairobi", rent: 45000, bedrooms: 2, bathrooms: 2, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop" },
  { id: 6, title: "Bedsitter Near CBD", location: "Upperhill, Nairobi", rent: 12000, bedrooms: 1, bathrooms: 1, image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=400&fit=crop" },
];

const Properties = () => {
  const [search, setSearch] = useState("");

  const filtered = sampleProperties.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">Find Your Next Home</h1>
            <p className="text-muted-foreground text-lg mb-8">Browse verified rental properties across Kenya</p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by location or name..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((property, i) => (
              <motion.div
                key={property.id}
                className="glass-card rounded-2xl overflow-hidden hover-lift"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display font-semibold text-lg mb-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.location}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {property.bedrooms} BR</span>
                    <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {property.bathrooms} BA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-lg">Ksh {property.rent.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                    <Button size="sm" variant="outline" className="gap-1">
                      View <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Properties;

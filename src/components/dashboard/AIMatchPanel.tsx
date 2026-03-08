import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Bed, Bath, Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface AIMatchPanelProps {
  userId: string;
  mode: "tenant" | "landlord";
  propertyId?: string;
}

const AIMatchPanel = ({ userId, mode, propertyId }: AIMatchPanelProps) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const findMatches = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match", {
        body: { mode, property_id: propertyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMatches(data.matches || []);
      if (!data.matches?.length) {
        toast.info(mode === "tenant" ? "No property matches found." : "No applicant matches found.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI recommendations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">
            {mode === "tenant" ? "AI Property Recommendations" : "AI Tenant Ranking"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "tenant"
              ? "Get personalized property matches based on your credit profile"
              : "AI-ranked applicants by reliability and creditworthiness"}
          </p>
        </div>
      </div>

      <Button onClick={findMatches} disabled={loading} className="gap-2 mb-5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analyzing..." : mode === "tenant" ? "Find My Best Matches" : "Rank Applicants"}
      </Button>

      {hasSearched && !loading && matches.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          {mode === "tenant" ? "No properties to recommend right now." : "No applicants to rank."}
        </p>
      )}

      <div className="space-y-3">
        {matches.map((match: any, i: number) => (
          <motion.div
            key={match.property_id || match.tenant_id || i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors"
          >
            {mode === "tenant" && match.property ? (
              <Link to={`/properties/${match.property.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-primary/10 text-primary text-[10px]">#{match.rank}</Badge>
                      <span className="font-display font-bold text-sm text-foreground truncate">
                        {match.property.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {match.property.location}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Bed className="h-3 w-3" /> {match.property.bedrooms}</span>
                      <span className="flex items-center gap-0.5"><Bath className="h-3 w-3" /> {match.property.bathrooms}</span>
                      <span className="font-semibold text-foreground">Ksh {match.property.rent_amount?.toLocaleString()}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">"{match.reason}"</p>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <Star className="h-4 w-4 text-primary mb-0.5" />
                    <span className="text-lg font-display font-bold text-primary">{match.match_score}</span>
                    <span className="text-[9px] text-muted-foreground">match</span>
                  </div>
                </div>
              </Link>
            ) : mode === "landlord" && match.profile ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary/10 text-primary text-[10px]">#{match.rank}</Badge>
                    <span className="font-display font-bold text-sm text-foreground">
                      {match.profile.name || "Unknown Tenant"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credit: {match.passport?.credit_score ?? "N/A"}/100 •
                    Confidence: {match.passport?.confidence_level ?? "N/A"} •
                    Verified: {match.passport?.total_verified_rent_payments ?? 0} payments
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">"{match.reason}"</p>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <Star className="h-4 w-4 text-primary mb-0.5" />
                  <span className="text-lg font-display font-bold text-primary">{match.match_score}</span>
                  <span className="text-[9px] text-muted-foreground">match</span>
                </div>
              </div>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AIMatchPanel;

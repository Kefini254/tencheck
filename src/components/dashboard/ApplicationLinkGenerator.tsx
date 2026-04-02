import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  userId: string;
}

const ApplicationLinkGenerator = ({ userId }: Props) => {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: properties, isLoading: propsLoading } = useQuery({
    queryKey: ["my-properties-for-links", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, location, is_available")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: links } = useQuery({
    queryKey: ["application-links", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("application_links")
        .select("*, properties(title, location)")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const generateLink = useMutation({
    mutationFn: async (propertyId: string) => {
      const { error } = await supabase.from("application_links").insert({
        property_id: propertyId,
        landlord_id: userId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application link generated!");
      queryClient.invalidateQueries({ queryKey: ["application-links"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/apply/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const existingPropertyIds = new Set((links ?? []).map((l: any) => l.property_id));

  return (
    <div className="space-y-6">
      {/* Generate new link */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <Link2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Application Links</h2>
            <p className="text-sm text-muted-foreground">Generate shareable links for tenant applications</p>
          </div>
        </div>

        {propsLoading ? (
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        ) : properties?.length === 0 ? (
          <p className="text-sm text-muted-foreground">List a property first to generate application links.</p>
        ) : (
          <div className="space-y-2">
            {properties?.filter(p => p.is_available && !existingPropertyIds.has(p.id)).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.location}</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => generateLink.mutate(p.id)}
                  disabled={generateLink.isPending}
                >
                  <Link2 className="h-3.5 w-3.5" /> Generate Link
                </Button>
              </div>
            ))}
            {properties?.filter(p => p.is_available && !existingPropertyIds.has(p.id)).length === 0 && (
              <p className="text-sm text-muted-foreground">All available properties already have application links.</p>
            )}
          </div>
        )}
      </div>

      {/* Existing links */}
      {(links ?? []).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Active Links</h3>
          <div className="space-y-3">
            {(links ?? []).map((link: any) => {
              const url = `${window.location.origin}/apply/${link.unique_token}`;
              const isExpired = link.expires_at && new Date(link.expires_at) < new Date();

              return (
                <div key={link.id} className="p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{link.properties?.title}</p>
                      <p className="text-xs text-muted-foreground">{link.properties?.location}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate block max-w-xs">{url}</code>
                        {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => copyLink(link.unique_token, link.id)}
                      >
                        {copiedId === link.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === link.id ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationLinkGenerator;

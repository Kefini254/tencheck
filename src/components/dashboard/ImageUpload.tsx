import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  bucket?: string;
  folder?: string;
}

const ImageUpload = ({
  images,
  onImagesChange,
  maxImages = 10,
  bucket = "property-images",
  folder = "uploads",
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = maxImages - images.length;

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, remaining);
      if (fileArray.length === 0) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      // Validate files
      for (const file of fileArray) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB limit`);
          return;
        }
      }

      setUploading(true);
      const newUrls: string[] = [];

      for (const file of fileArray) {
        const ext = file.name.split(".").pop();
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        onImagesChange([...images, ...newUrls]);
        toast.success(`${newUrls.length} image${newUrls.length > 1 ? "s" : ""} uploaded`);
      }
      setUploading(false);
    },
    [images, onImagesChange, remaining, maxImages, bucket, folder]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Property Photos
        </p>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {images.map((url, i) => (
            <div
              key={i}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={url}
                alt={`Property photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      {remaining > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            dragOver
              ? "border-primary bg-accent/50"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="p-3 rounded-full bg-accent">
                <ImageIcon className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop images here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG or WebP • Max 5MB each • {remaining} remaining
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageUpload;

# File & Asset Hooks

Data fetching hooks for file and asset management using Eden Treaty + TanStack Query.

## Overview

| Hook | Purpose | Use Case |
|------|---------|----------|
| `useAssets()` | List all assets (gallery) | Asset picker modal |
| `useAsset(id)` | Get single asset | Display asset details |
| `useUploadAsset()` | Upload to shared gallery | Product images |
| `useDeleteAsset()` | Remove from gallery | Cleanup unused assets |
| `useFile(id)` | Get private file | Logo, profile photo |
| `useUploadFile()` | Upload private file | Onboarding uploads |
| `useDeleteFile()` | Remove private file | Delete logo |

## Asset Hooks (Shared Gallery)

### useAssets - Gallery List

```typescript
import { useQuery } from "@tanstack/react-query";
import { eden } from "~/lib/api-client";
import { toast } from "sonner";

export interface Asset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string; // Signed URL from backend
}

export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: () => [...assetKeys.lists()] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

export function useAssets() {
  return useQuery({
    queryKey: assetKeys.list(),
    queryFn: async () => {
      const response = await eden.api.v1.assets.get();

      if (response.error) {
        throw new Error(response.error.value as string);
      }

      return response.data as Asset[];
    },
  });
}
```

**Usage:**
```tsx
function AssetGallery() {
  const { data: assets, isLoading } = useAssets();

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-4 gap-4">
      {assets?.map((asset) => (
        <img key={asset.id} src={asset.url} alt={asset.filename} />
      ))}
    </div>
  );
}
```

### useAsset - Single Asset

```typescript
export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      const response = await eden.api.v1.assets({ id }).get();

      if (response.error) {
        throw new Error(response.error.value as string);
      }

      return response.data as Asset;
    },
    enabled: !!id, // Only fetch if ID exists
  });
}
```

### useUploadAsset - Upload to Gallery

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface AssetUploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await eden.api.v1.assets.upload.post(formData);

      if (response.error) {
        throw new Error(response.error.value as string);
      }

      return response.data as AssetUploadResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      toast.success("Asset uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload asset");
    },
  });
}
```

**Usage:**
```tsx
function AssetUploader() {
  const upload = useUploadAsset();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload.mutateAsync(file);
    console.log("Uploaded asset ID:", result.id); // Store this ID in your entity
  };

  return <input type="file" onChange={handleFileSelect} />;
}
```

### useDeleteAsset - Remove from Gallery

```typescript
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await eden.api.v1.assets({ id }).delete();

      if (response.error) {
        throw new Error(response.error.value as string);
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      toast.success("Asset deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete asset");
    },
  });
}
```

## File Hooks (Private Attachments)

### useFile - Get Private File

```typescript
import { useQuery } from "@tanstack/react-query";
import { eden } from "~/lib/api-client";

export interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string; // Signed URL
}

export const fileKeys = {
  all: ["files"] as const,
  details: () => [...fileKeys.all, "detail"] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
};

export function useFile(id: string) {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: async () => {
      const response = await eden.api.v1.files({ id }).get();

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return response.data as FileRecord;
    },
    enabled: !!id,
  });
}
```

### useUploadFile - Upload Private File

**Important:** Files use native `fetch` for FormData uploads (Eden Treaty has issues with FormData):

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Allowed types (must match backend validation)
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_FILE_EXTENSIONS = ".jpg,.jpeg,.png,.webp";
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate file before upload
 * @returns Error message if invalid, null if valid
 */
export function validateFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    return "Only JPG, PNG, WEBP images allowed (no SVG)";
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }

  return null;
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // Client-side validation
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      const formData = new FormData();
      formData.append("file", file);

      // Get auth token from storage
      const token = localStorage.getItem('bearer_token');
      
      // Use native fetch for FormData
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/v1/files/upload`, {
        method: "POST",
        body: formData,
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to upload file";
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as FileUploadResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload file");
    },
  });
}
```

### useDeleteFile - Remove Private File

```typescript
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await eden.api.v1.files({ id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
      toast.success("File deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete file");
    },
  });
}
```

## Complete Example: Product Form with Asset Picker

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAssets, useUploadAsset } from "~/hooks/use-assets";
import { eden } from "~/lib/api-client";

const productSchema = z.object({
  name: z.string().min(1),
  imageId: z.string().uuid().optional(), // Store asset ID, not URL
});

type ProductForm = z.infer<typeof productSchema>;

function ProductForm() {
  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const { data: assets } = useAssets();
  const uploadAsset = useUploadAsset();

  const onSubmit = async (data: ProductForm) => {
    // Send imageId to backend
    await eden.api.v1.products.post(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} placeholder="Product name" />
      
      {/* Asset Picker */}
      <div className="grid grid-cols-4 gap-2">
        {assets?.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => form.setValue("imageId", asset.id)}
            className={form.watch("imageId") === asset.id ? "ring-2" : ""}
          >
            <img src={asset.url} alt={asset.filename} className="w-full h-20 object-cover" />
          </button>
        ))}
      </div>

      {/* Upload New Asset */}
      <input
        type="file"
        accept="image/*,video/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const result = await uploadAsset.mutateAsync(file);
            form.setValue("imageId", result.id);
          }
        }}
      />

      <button type="submit">Save Product</button>
    </form>
  );
}
```

## Complete Example: Logo Upload (Onboarding)

```tsx
import { useState } from "react";
import { useUploadFile } from "~/hooks/use-files";

function LogoUploadStep({ onComplete }: { onComplete: (logoId: string) => void }) {
  const uploadFile = useUploadFile();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload and get ID
    const result = await uploadFile.mutateAsync(file);
    
    // Pass ID to parent (will be saved with organization later)
    onComplete(result.id);
  };

  return (
    <div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={handleFileSelect}
      />
      {preview && <img src={preview} alt="Logo preview" className="w-32 h-32 object-contain" />}
    </div>
  );
}
```

## Key Principles

1. **Store IDs, not URLs** - Backend generates signed URLs on-demand
2. **Query keys matter** - Use consistent key patterns for caching
3. **Validate before upload** - Check file type/size client-side
4. **Handle FormData carefully** - Use native fetch for file uploads
5. **Enable conditional queries** - `enabled: !!id` prevents empty fetches
6. **Invalidate on mutation** - Update cache after upload/delete

'use client';

import React, { useCallback, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Camera, ZoomIn, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { uploadDocument, documentPreviewUrl } from '@/lib/api/documents';
import { useToast } from '@/components/Toaster';

interface AvatarUploaderProps {
  /** Employee id — used as the document entity id. */
  employeeId: string;
  /** Current avatar URL (if any). */
  avatarUrl?: string;
  /** Fallback initials shown when there's no photo. */
  initials: string;
  /** Persist the new avatar URL on the employee. */
  onChange: (url: string) => void;
  /** Avatar diameter in px. */
  size?: number;
  /** Tailwind classes for the ring/border. */
  ringClassName?: string;
}

/** Crop the source image to the selected square area and return a JPEG blob. */
async function cropToBlob(src: string, area: Area, output = 512): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, output, output);

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Crop failed'))), 'image/jpeg', 0.9),
  );
}

/**
 * Round profile-photo avatar with upload → crop → save, and click-to-view.
 * The cropped square is uploaded via the documents API and its preview URL is
 * stored on the employee.
 */
export function AvatarUploader({
  employeeId,
  avatarUrl,
  initials,
  onChange,
  size = 96,
  ringClassName = 'ring-4 ring-[#FFFFFF]',
}: AvatarUploaderProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [src, setSrc] = useState<string | null>(null); // image being cropped
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setAreaPixels(pixels), []);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!src || !areaPixels) return;
    setSaving(true);
    try {
      const blob = await cropToBlob(src, areaPixels);
      const file = new File([blob], `avatar-${employeeId}.jpg`, { type: 'image/jpeg' });
      const doc = await uploadDocument({
        entityType: 'employee',
        entityId: employeeId,
        category: 'avatar',
        file,
      });
      onChange(documentPreviewUrl(doc.id));
      toast.success('Profile photo updated.');
      setSrc(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload the photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {/* Avatar — click to view when a photo exists */}
        <button
          type="button"
          onClick={() => (avatarUrl ? setViewing(true) : fileRef.current?.click())}
          className={`grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-2xl font-bold text-white ${ringClassName}`}
          title={avatarUrl ? 'View photo' : 'Upload photo'}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </button>

        {/* Edit/upload button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Change photo"
          title="Change photo"
          className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border-2 border-[#FFFFFF] bg-accent-600 text-white shadow-sm transition hover:bg-accent-700"
        >
          <Camera size={13} />
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={pickFile}
          className="hidden"
        />
      </div>

      {/* Crop dialog */}
      <Dialog open={!!src} onOpenChange={o => !o && !saving && setSrc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
            <DialogDescription>Drag to reposition and zoom to frame the photo.</DialogDescription>
          </DialogHeader>

          <div className="relative h-64 w-full overflow-hidden rounded-xl bg-[#111827]">
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <ZoomIn size={15} className="shrink-0 text-gray-500" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-accent-600"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSrc(null)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save photo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog (full image) */}
      <Dialog open={viewing} onOpenChange={setViewing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Profile photo</DialogTitle>
          </DialogHeader>
          {avatarUrl && (
            <div className="overflow-hidden rounded-xl border border-[#E4E6EA] bg-[#F1F3F5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="Profile" className="mx-auto max-h-[70vh] w-full object-contain" />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewing(false)}>
              Close
            </Button>
            <Button type="button" onClick={() => fileRef.current?.click()}>
              <Camera size={14} /> Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AvatarUploader;

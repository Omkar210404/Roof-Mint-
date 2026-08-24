'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, X, Video, MapPin,
  Car, Wifi, Droplets, Zap, Trees, Dumbbell, ShieldCheck, Building2,
  Upload, Trash2, Check, Loader2, AlertCircle, Image as ImageIcon, Film, GripVertical
} from 'lucide-react';
import { createProperty, updateProperty, getAgentsForSelect } from './actions';
import { uploadPropertyMedia, UploadError } from '@/lib/upload-media';
import { deriveCaptionFromFilename } from '@/lib/derive-caption';
import { AiEnhanceButton } from '@/components/ai-enhance-button';

function Youtube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const defaultAmenityOptions = [
  { id: 'covered_parking', label: 'Covered Parking', icon: 'car' },
  { id: 'smart_home', label: 'Smart Home', icon: 'wifi' },
  { id: 'water_supply', label: '24/7 Water', icon: 'droplets' },
  { id: 'power_backup', label: 'Power Backup', icon: 'zap' },
  { id: 'open_space', label: 'Open Space', icon: 'trees' },
  { id: 'gym_pool', label: 'Gym & Pool', icon: 'dumbbell' },
  { id: 'security', label: '24/7 Security', icon: 'shield' },
  { id: 'clubhouse', label: 'Clubhouse', icon: 'building' },
  { id: 'jogging_track', label: 'Jogging Track', icon: 'trees' },
  { id: 'play_area', label: 'Play Area', icon: 'trees' },
  { id: 'garden', label: 'Garden', icon: 'trees' },
  { id: 'indoor_games', label: 'Indoor Games', icon: 'dumbbell' },
  { id: 'ev_charging', label: 'EV Charging', icon: 'zap' },
  { id: 'rainwater', label: 'Rainwater', icon: 'droplets' },
  { id: 'intercom', label: 'Intercom', icon: 'wifi' },
  { id: 'cctv', label: 'CCTV', icon: 'shield' },
];

// "RERA Approved" was deliberately removed from this list — it was a free-
// text marketing tag with nothing backing it, indistinguishable from a real
// registration status. RERA compliance should only ever come from the
// actual RERA Number field below, which is sourced and verifiable.
const defaultHighlightOptions = [
  'Near Metro Station', 'Gated Community', 'Top Builder',
  'Vastu Compliant', 'Lake View', 'Park Facing', 'Corner Unit',
  'Ready to Move', 'Under Construction', 'Premium Location', 'Investment Hotspot',
];

const iconMap: Record<string, any> = {
  car: Car, wifi: Wifi, droplets: Droplets, zap: Zap,
  trees: Trees, dumbbell: Dumbbell, shield: ShieldCheck, building: Building2,
};

// ── Styles ────────────────────────────────────────────────────────────────────
const input = "w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400";
const textarea = "w-full px-3 py-2 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400 resize-none";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";
const reqDot = " after:content-['*'] after:ml-0.5 after:text-red-400";

type UploadItem = { id: string; name: string; status: 'uploading' | 'done' | 'error'; error?: string };

export function PropertyForm({ mode, propertyId, initialData }: { mode: 'create' | 'edit'; propertyId?: string; initialData?: any }) {
  const router = useRouter();
  const [agents, setAgents] = useState<{ id: string; name: string; company: string }[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(() =>
    (initialData?.property_media || [])
      .filter((m: any) => m.media_type === 'image')
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m: any) => m.url)
  );
  // Which room/area each photo shows (e.g. "Master Bedroom", "Attached
  // Washroom") — keyed by URL so it survives reordering. Auto-suggested
  // from the uploaded file's own name (admins already name their photos
  // meaningfully), but always editable.
  const [imageCaptions, setImageCaptions] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of initialData?.property_media || []) {
      if (m.media_type === 'image' && m.caption) map[m.url] = m.caption;
    }
    return map;
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const [videoUrls, setVideoUrls] = useState<string[]>(() =>
    (initialData?.property_media || []).filter((m: any) => m.media_type === 'video').map((m: any) => m.url)
  );
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState(() => (initialData?.property_media || []).find((m: any) => m.media_type === 'video_youtube')?.url || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialData?.amenities || []);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>(initialData?.highlights || []);
  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [customHighlightInput, setCustomHighlightInput] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState(
    initialData?.nearby_places?.length
      ? initialData.nearby_places.map((p: any) => ({ name: p.name || '', distance: p.distance || '' }))
      : [{ name: '', distance: '' }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Title/Description are plain uncontrolled inputs (read via FormData at
  // submit time, like the rest of Basic Info) — these refs just let the AI
  // Enhance button read/replace their value without restructuring the form.
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Controlled (not defaultValue) because the agent list itself loads
  // async — on first render there's no <option> matching a saved agent's
  // id yet, so defaultValue silently picks "— Select —" and never
  // retroactively corrects itself once the real options arrive a moment
  // later, even though the property really does have an agent saved.
  const [primaryAgentId, setPrimaryAgentId] = useState(initialData?.primary_agent_id || '');

  // Direct upload state
  const [imageUploads, setImageUploads] = useState<UploadItem[]>([]);
  const [videoUploads, setVideoUploads] = useState<UploadItem[]>([]);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch agents from DB on mount
  useEffect(() => {
    getAgentsForSelect().then(setAgents);
  }, []);

  const addImage = () => {
    const url = newImageUrl.trim();
    if (url && !imageUrls.includes(url)) { setImageUrls([...imageUrls, url]); setNewImageUrl(''); }
  };
  const addBulk = () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u && !imageUrls.includes(u));
    if (urls.length) { setImageUrls([...imageUrls, ...urls]); setBulkUrls(''); setShowBulk(false); }
  };
  const addVideoUrl = () => {
    const url = newVideoUrl.trim();
    if (url && !videoUrls.includes(url)) { setVideoUrls([...videoUrls, url]); setNewVideoUrl(''); }
  };
  const toggle = (list: string[], item: string, setter: (v: string[]) => void) =>
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);

  const addCustomHighlight = () => {
    const val = customHighlightInput.trim();
    if (val && !selectedHighlights.includes(val)) setSelectedHighlights([...selectedHighlights, val]);
    setCustomHighlightInput('');
  };
  const addCustomAmenity = () => {
    const val = customAmenityInput.trim();
    if (val && !selectedAmenities.includes(val)) setSelectedAmenities([...selectedAmenities, val]);
    setCustomAmenityInput('');
  };

  // Merge predefined + any custom-added values not in the predefined list,
  // so custom entries still render as removable/toggleable chips.
  const highlightChips = [...defaultHighlightOptions, ...selectedHighlights.filter(h => !defaultHighlightOptions.includes(h))];
  const amenityChips = [
    ...defaultAmenityOptions,
    ...selectedAmenities
      .filter(a => !defaultAmenityOptions.some(opt => opt.id === a))
      .map(a => ({ id: a, label: a, icon: 'building' })),
  ];

  const uploadFiles = async (
    files: FileList,
    setUploads: React.Dispatch<React.SetStateAction<UploadItem[]>>,
    onUrl: (url: string, fileName: string) => void,
    expectedType: 'image' | 'video'
  ) => {
    const items: UploadItem[] = Array.from(files).map(f => ({ id: crypto.randomUUID(), name: f.name, status: 'uploading' }));
    setUploads(prev => [...prev, ...items]);

    await Promise.all(Array.from(files).map(async (file, i) => {
      const item = items[i];
      try {
        const url = await uploadPropertyMedia(file, expectedType);
        onUrl(url, file.name);
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'done' } : u));
      } catch (err) {
        const message = err instanceof UploadError ? err.message : 'Upload failed';
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', error: message } : u));
      }
    }));
  };

  const handleImageFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      uploadFiles(files, setImageUploads, (url, fileName) => {
        setImageUrls(prev => [...prev, url]);
        const suggested = deriveCaptionFromFilename(fileName);
        if (suggested) setImageCaptions(prev => ({ ...prev, [url]: suggested }));
      }, 'image');
    }
    e.target.value = '';
  };

  const handleVideoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      uploadFiles(files, setVideoUploads, url => setVideoUrls(prev => [...prev, url]), 'video');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const fd = new FormData(e.currentTarget);
    fd.append('image_urls', JSON.stringify(imageUrls));
    fd.append('image_captions', JSON.stringify(imageUrls.map(url => imageCaptions[url] || '')));
    fd.append('video_urls', JSON.stringify(videoUrls));
    fd.append('youtube_url', youtubeUrl);
    fd.append('amenities', JSON.stringify(selectedAmenities));
    fd.append('highlights', JSON.stringify(selectedHighlights));
    fd.append('nearby_places', JSON.stringify(nearbyPlaces.filter((p: any) => p.name.trim())));

    const result = mode === 'edit' && propertyId
      ? await updateProperty(propertyId, fd)
      : await createProperty(fd);

    if (result?.error) {
      setSubmitError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.push('/admin/properties');
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/properties" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-xl font-bold text-navy dark:text-white">{mode === 'edit' ? 'Edit Property' : 'Add Property'}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/properties" className="h-9 px-4 rounded-lg border border-gray-200/60 dark:border-gray-800/60 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors inline-flex items-center">Cancel</Link>
          <button form="property-form" type="submit" disabled={isSubmitting}
            className="h-9 px-5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-60 inline-flex items-center gap-1.5">
            {isSubmitting ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Save Property'}
          </button>
        </div>
      </div>

      {submitError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
          Error: {submitError}
        </div>
      )}

      <form id="property-form" onSubmit={handleSubmit} className="space-y-5">

        {/* ═══ SECTION 1: BASIC INFO ═══════════════════════════════════ */}
        <Card title="Basic Information">
          <div className="grid grid-cols-6 gap-x-4 gap-y-4">
            <div className="col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + reqDot + " mb-0"}>Title</label>
                <AiEnhanceButton
                  getValue={() => titleInputRef.current?.value || ''}
                  setValue={(text) => { if (titleInputRef.current) titleInputRef.current.value = text; }}
                  fieldType="title"
                />
              </div>
              <input ref={titleInputRef} name="title" required defaultValue={initialData?.title} placeholder="Prestige Lakeside Habitat" className={input} />
            </div>
            <div className="col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>Description</label>
                <AiEnhanceButton
                  getValue={() => descriptionRef.current?.value || ''}
                  setValue={(text) => { if (descriptionRef.current) descriptionRef.current.value = text; }}
                  fieldType="description"
                />
              </div>
              <textarea ref={descriptionRef} name="description" rows={3} defaultValue={initialData?.description} placeholder="Describe the property..." className={textarea} />
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>Type</label>
              <select name="property_type" defaultValue={initialData?.property_type || 'Apartment'} className={input}>
                <option>Apartment</option><option>Villa</option><option>Plot</option>
                <option>Penthouse</option><option>Commercial</option><option>Row House</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Listing Type</label>
              <select name="listing_type" defaultValue={initialData?.listing_type || 'Sale'} className={input}>
                <option value="Sale">Sale (Buy)</option>
                <option value="Rent">Rent</option>
                <option value="Resale">Resale</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Ownership</label>
              <select name="ownership" defaultValue={initialData?.ownership || '1st Owner'} className={input}>
                <option value="1st Owner">1st Owner / Builder</option>
                <option value="2nd Owner">2nd Owner</option>
                <option value="3rd Owner">3rd Owner</option>
                <option value="4th+ Owner">4th+ Owner</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>BHK</label>
              <select name="bhk" defaultValue={initialData?.bhk ? String(initialData.bhk) : '1'} className={input}>
                <option value="1">1 BHK</option><option value="2">2 BHK</option>
                <option value="3">3 BHK</option><option value="4">4 BHK</option>
                <option value="5">5+ BHK</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls + reqDot}>Price (₹)</label>
              <input name="price" type="number" required defaultValue={initialData?.price} placeholder="12800000" className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Price Type</label>
              <select name="price_type" defaultValue={initialData?.price_type || 'fixed'} className={input}>
                <option value="fixed">Fixed</option><option value="negotiable">Negotiable</option>
                <option value="starting_from">Starting From</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Carpet (sqft)</label>
              <input name="carpet_area" type="number" defaultValue={initialData?.carpet_area} placeholder="1200" className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Super Area</label>
              <input name="built_up_area" type="number" defaultValue={initialData?.built_up_area} placeholder="1450" className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Floor</label>
              <input name="floor" defaultValue={initialData?.floor} placeholder="12th of 24" className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Possession</label>
              <input name="possession" defaultValue={initialData?.possession} placeholder="Dec 2025" className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Furnishing</label>
              <select name="furnishing" defaultValue={initialData?.furnishing || 'Unfurnished'} className={input}>
                <option>Unfurnished</option><option value="Semi">Semi</option><option value="Full">Fully</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Status</label>
              <select name="status" defaultValue={initialData?.status || 'available'} className={input}>
                <option value="available">Available</option><option value="sold">Sold</option>
                <option value="reserved">Reserved</option><option value="coming_soon">Coming Soon</option>
                <option value="on_hold">On Hold (not shown on site)</option>
              </select>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>RERA Number</label>
              <input name="rera_number" defaultValue={initialData?.rera_number} placeholder="PRM/KA/RERA/1234/..." className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Demand</label>
              <select name="demand_tag" defaultValue={initialData?.demand_tag || 'moderate'} className={input}>
                <option value="high">🔥 High</option><option value="moderate">📈 Moderate</option><option value="low">📉 Low</option>
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls + reqDot}>Primary Agent</label>
              <select name="primary_agent_id" required value={primaryAgentId} onChange={e => setPrimaryAgentId(e.target.value)} className={input}>
                <option value="">— Select —</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}{agent.company ? ` — ${agent.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ═══ SECTION 2: LOCATION ════════════════════════════════════ */}
        <Card title="Location">
          <div className="grid grid-cols-6 gap-x-4 gap-y-4">
            <div className="col-span-6">
              <label className={labelCls + reqDot}>Full Address</label>
              <input name="location_address" required defaultValue={initialData?.location_address} placeholder="ITPL Main Road, Whitefield, Bangalore - 560066" className={input} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>City</label>
              <input name="city" defaultValue={initialData?.city} placeholder="Bangalore" className={input} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Locality</label>
              <input name="locality" defaultValue={initialData?.locality} placeholder="Whitefield" className={input} />
            </div>
          </div>

          {/* Nearby */}
          <div className="mt-5 pt-4 border-t border-gray-100/60 dark:border-gray-800/60">
            <label className={labelCls + " mb-2"}>Nearby Landmarks</label>
            <div className="space-y-2">
              {nearbyPlaces.map((p: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="ITPL Tech Park" value={p.name} onChange={e => { const u = [...nearbyPlaces]; u[i].name = e.target.value; setNearbyPlaces(u); }} className={input + " flex-1"} />
                  <input placeholder="0.5 km" value={p.distance} onChange={e => { const u = [...nearbyPlaces]; u[i].distance = e.target.value; setNearbyPlaces(u); }} className={input + " !w-24"} />
                  <button type="button" onClick={() => setNearbyPlaces(nearbyPlaces.filter((_: any, j: number) => j !== i))} className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setNearbyPlaces([...nearbyPlaces, { name: '', distance: '' }])} className="mt-2 text-xs font-semibold text-primary hover:text-teal-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add landmark
            </button>
          </div>
        </Card>

        {/* ═══ SECTION 3: MEDIA ═══════════════════════════════════════ */}
        <Card title="Media">
          {/* Direct image upload */}
          <div>
            <label className={labelCls}><ImageIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Upload Images</label>
            <input ref={imageFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageFilesSelected} />
            <button type="button" onClick={() => imageFileInputRef.current?.click()}
              className="w-full h-20 rounded-lg border-2 border-dashed border-gray-200/60 dark:border-gray-800/60 hover:border-primary hover:bg-teal-50/40 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors">
              <Upload className="w-5 h-5" />
              <span className="text-xs font-medium">Click to choose image file(s), or drop them here</span>
            </button>
            {imageUploads.length > 0 && (
              <UploadQueueList items={imageUploads} onClear={() => setImageUploads(prev => prev.filter(u => u.status === 'uploading'))} />
            )}
          </div>

          {/* Optional: paste a URL instead */}
          <div className="mt-3 pt-3 border-t border-gray-100/60 dark:border-gray-800/60">
            <label className={labelCls}>Or paste an image URL (optional)</label>
            <div className="flex gap-2">
              <input placeholder="https://example.com/photo.jpg" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                className={input + " flex-1"} />
              <button type="button" onClick={addImage} className="h-10 px-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-teal-700 shrink-0 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <button type="button" onClick={() => setShowBulk(!showBulk)} className="mt-2 text-xs font-semibold text-primary hover:text-teal-700 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> {showBulk ? 'Hide' : 'Bulk add (multiple URLs)'}
            </button>

            {showBulk && (
              <div className="mt-2 space-y-2">
                <textarea placeholder={"One URL per line:\nhttps://example.com/img1.jpg\nhttps://example.com/img2.jpg"} value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} className={textarea + " min-h-[80px]"} />
                <button type="button" onClick={addBulk} className="h-8 px-3 bg-primary text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Add All
                </button>
              </div>
            )}
          </div>

          {/* Preview grid — drag to reorder; first tile is always the cover photo */}
          {imageUrls.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-2">{imageUrls.length} image(s) • Drag to reorder • First = cover photo • Label each photo (e.g. "Master Bedroom") so visitors know what they're looking at</p>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {imageUrls.map((url, i) => (
                  <div
                    key={url}
                    draggable
                    onDragStart={() => setDraggedImageIndex(i)}
                    onDragOver={(e) => { e.preventDefault(); if (dragOverImageIndex !== i) setDragOverImageIndex(i) }}
                    onDragLeave={() => setDragOverImageIndex(prev => prev === i ? null : prev)}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedImageIndex === null || draggedImageIndex === i) { setDraggedImageIndex(null); setDragOverImageIndex(null); return }
                      const next = [...imageUrls]
                      const [moved] = next.splice(draggedImageIndex, 1)
                      next.splice(i, 0, moved)
                      setImageUrls(next)
                      setDraggedImageIndex(null)
                      setDragOverImageIndex(null)
                    }}
                    onDragEnd={() => { setDraggedImageIndex(null); setDragOverImageIndex(null) }}
                    className={`group rounded-lg overflow-hidden border bg-gray-50 dark:bg-navy-800 cursor-grab active:cursor-grabbing transition-opacity ${dragOverImageIndex === i && draggedImageIndex !== i ? 'border-primary ring-2 ring-primary/40' : 'border-gray-200/60 dark:border-gray-800/60'} ${draggedImageIndex === i ? 'opacity-40' : ''}`}
                  >
                    <div className="relative aspect-[4/3]">
                      <img src={url} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      {i === 0 && <span className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded">COVER</span>}
                      <div className="absolute bottom-1 left-1 w-5 h-5 bg-black/50 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <button type="button" onClick={() => {
                        setImageUrls(imageUrls.filter((_, j) => j !== i))
                        setImageCaptions(prev => { const next = { ...prev }; delete next[url]; return next })
                      }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      value={imageCaptions[url] || ''}
                      onChange={e => setImageCaptions(prev => ({ ...prev, [url]: e.target.value }))}
                      placeholder="e.g. Master Bedroom"
                      className="w-full px-1.5 py-1 text-[10px] bg-transparent border-t border-gray-200/60 dark:border-gray-800/60 focus:outline-none focus:bg-white dark:focus:bg-navy-900 text-navy dark:text-white placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct video upload (bulk) */}
          <div className="mt-5 pt-4 border-t border-gray-100/60 dark:border-gray-800/60">
            <label className={labelCls}><Film className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Upload Videos (select multiple for bulk upload, max 50MB each)</label>
            <input ref={videoFileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoFilesSelected} />
            <button type="button" onClick={() => videoFileInputRef.current?.click()}
              className="w-full h-20 rounded-lg border-2 border-dashed border-gray-200/60 dark:border-gray-800/60 hover:border-primary hover:bg-teal-50/40 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors">
              <Upload className="w-5 h-5" />
              <span className="text-xs font-medium">Click to choose video file(s) — walkthroughs, tours, etc.</span>
            </button>
            {videoUploads.length > 0 && (
              <UploadQueueList items={videoUploads} onClear={() => setVideoUploads(prev => prev.filter(u => u.status === 'uploading'))} />
            )}

            {videoUrls.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {videoUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-navy-800 rounded-lg px-3 h-9">
                    <Video className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{url}</span>
                    <button type="button" onClick={() => setVideoUrls(videoUrls.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <input placeholder="Or paste a video URL..." value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }}
                className={input + " flex-1"} />
              <button type="button" onClick={addVideoUrl} className="h-10 px-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-teal-700 shrink-0 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* YouTube */}
          <div className="mt-4 pt-4 border-t border-gray-100/60 dark:border-gray-800/60">
            <label className={labelCls}><Youtube className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-red-500 dark:text-red-400" />YouTube</label>
            <input placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className={input} />
          </div>
          {youtubeUrl && (() => {
            let vid = '';
            if (youtubeUrl.includes('youtu.be/')) vid = youtubeUrl.split('youtu.be/')[1]?.split('?')[0];
            else if (youtubeUrl.includes('v=')) vid = youtubeUrl.split('v=')[1]?.split('&')[0];
            return vid ? (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200/60 dark:border-gray-800/60 aspect-video max-w-sm">
                <iframe src={`https://www.youtube.com/embed/${vid}`} className="w-full h-full" allowFullScreen title="Preview" />
              </div>
            ) : null;
          })()}
        </Card>

        {/* ═══ SECTION 4: HIGHLIGHTS ══════════════════════════════════ */}
        <Card title="Highlights">
          <div className="flex flex-wrap gap-1.5">
            {highlightChips.map(tag => (
              <button key={tag} type="button" onClick={() => toggle(selectedHighlights, tag, setSelectedHighlights)}
                className={`h-8 px-3 rounded-lg text-xs font-medium border transition-all ${selectedHighlights.includes(tag)
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-primary text-primary'
                  : 'bg-white dark:bg-navy-900 border-gray-200/60 dark:border-gray-800/60 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                  }`}>
                {selectedHighlights.includes(tag) && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100/60 dark:border-gray-800/60">
            <input placeholder="Add a custom highlight..." value={customHighlightInput} onChange={e => setCustomHighlightInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomHighlight(); } }}
              className={input + " flex-1"} />
            <button type="button" onClick={addCustomHighlight} className="h-10 px-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-teal-700 shrink-0 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </Card>

        {/* ═══ SECTION 5: AMENITIES ═══════════════════════════════════ */}
        <Card title="Amenities">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {amenityChips.map(a => {
              const Icon = iconMap[a.icon] || Building2;
              const on = selectedAmenities.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggle(selectedAmenities, a.id, setSelectedAmenities)}
                  className={`flex items-center gap-2 h-10 px-3 rounded-lg border text-xs font-medium transition-all ${on
                    ? 'bg-teal-50 dark:bg-teal-950/40 border-primary text-primary'
                    : 'bg-white dark:bg-navy-900 border-gray-200/60 dark:border-gray-800/60 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                    }`}>
                  <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className="truncate">{a.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100/60 dark:border-gray-800/60">
            <input placeholder="Add a custom amenity..." value={customAmenityInput} onChange={e => setCustomAmenityInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
              className={input + " flex-1"} />
            <button type="button" onClick={addCustomAmenity} className="h-10 px-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-teal-700 shrink-0 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </Card>

      </form>
    </div>
  );
}

function UploadQueueList({ items, onClear }: { items: UploadItem[]; onClear: () => void }) {
  const stillUploading = items.some(i => i.status === 'uploading');
  return (
    <div className="mt-2 space-y-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-navy-800 rounded-lg px-3 h-8">
          {item.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
          {item.status === 'done' && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
          {item.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
          <span className="truncate flex-1 text-gray-600 dark:text-gray-300">{item.name}</span>
          <span className={`shrink-0 font-medium ${item.status === 'error' ? 'text-red-500' : item.status === 'done' ? 'text-green-600' : 'text-gray-400'}`}>
            {item.status === 'uploading' ? 'Uploading…' : item.status === 'done' ? 'Done' : item.error || 'Failed'}
          </span>
        </div>
      ))}
      {!stillUploading && (
        <button type="button" onClick={onClear} className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          Clear list
        </button>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl">
      <div className="h-11 px-5 flex items-center border-b border-gray-100/60 dark:border-gray-800/60">
        <h2 className="text-sm font-bold text-navy dark:text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

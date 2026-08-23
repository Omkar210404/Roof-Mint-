'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  ArrowLeft, Download, Upload, ChevronDown, ChevronUp, Trash2, Plus, X,
  Check, AlertCircle, AlertTriangle, Loader2, Image as ImageIcon, Film, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { createProperty, getAgentsForSelect, getExistingPropertyTitles } from '../actions';
import { uploadPropertyMedia, UploadError } from '@/lib/upload-media';
import { deriveCaptionFromFilename } from '@/lib/derive-caption';
import {
  LABEL_TO_KEY, PROPERTY_TYPES, LISTING_TYPES, OWNERSHIPS, FURNISHINGS,
  PRICE_TYPES, STATUSES, DEMAND_TAGS, BHKS,
} from './template-shape';

// ── Shared styles (mirrors property-form.tsx) ──────────────────────────────
const input = "w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400";
const textarea = "w-full px-3 py-2 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400 resize-none";
const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1";

// Both the .xlsx template and a hand-typed .csv can use either the
// human-readable column labels ("Property Type") or the raw field names
// ("property_type") as the header row — this maps whichever text is there
// back to the field key the rest of this file works with.
function remapHeaders(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = LABEL_TO_KEY[key.trim().toLowerCase()] || LABEL_TO_KEY[key.trim()];
    out[mapped || key] = value;
  }
  return out;
}

function splitList(value: string): string[] {
  return (value || '').split(';').map(s => s.trim()).filter(Boolean);
}

function parseNearby(value: string): { name: string; distance: string }[] {
  return splitList(value).map(pair => {
    const [name, distance] = pair.split(':').map(s => s.trim());
    return { name: name || '', distance: distance || '' };
  }).filter(p => p.name);
}

function pickEnum(value: string, allowed: string[], fallback: string): { value: string; corrected: boolean } {
  const trimmed = (value || '').trim();
  if (!trimmed) return { value: fallback, corrected: false };
  const match = allowed.find(a => a.toLowerCase() === trimmed.toLowerCase());
  return match ? { value: match, corrected: false } : { value: fallback, corrected: true };
}

type UploadItem = { id: string; name: string; status: 'uploading' | 'done' | 'error'; error?: string };

type Fields = {
  title: string; description: string; property_type: string; listing_type: string;
  ownership: string; bhk: string; furnishing: string; carpet_area: string;
  built_up_area: string; floor: string; possession: string; price: string;
  price_type: string; location_address: string; city: string; locality: string;
  rera_number: string; demand_tag: string; status: string;
  primary_agent_name: string; primary_agent_id: string;
  amenities: string[]; highlights: string[];
  nearbyPlaces: { name: string; distance: string }[];
  csvImageUrls: string[]; csvVideoUrls: string[]; youtube_url: string;
};

type ImportRow = {
  key: string;
  rowNumber: number;
  fields: Fields;
  warnings: string[];
  uploadedImageUrls: string[];
  imageCaptions: Record<string, string>;
  uploadedVideoUrls: string[];
  imageUploads: UploadItem[];
  videoUploads: UploadItem[];
  expanded: boolean;
  saveStatus: 'pending' | 'saving' | 'saved' | 'error';
  saveError?: string;
};

function buildRow(raw: Record<string, string>, rowNumber: number, agents: { id: string; name: string }[]): ImportRow {
  const warnings: string[] = [];

  const propertyType = pickEnum(raw.property_type, PROPERTY_TYPES, 'Apartment');
  if (propertyType.corrected) warnings.push(`Unrecognized property_type "${raw.property_type}" — defaulted to Apartment`);
  const listingType = pickEnum(raw.listing_type, LISTING_TYPES, 'Sale');
  if (listingType.corrected) warnings.push(`Unrecognized listing_type "${raw.listing_type}" — defaulted to Sale`);
  const ownership = pickEnum(raw.ownership, OWNERSHIPS, '1st Owner');
  if (ownership.corrected) warnings.push(`Unrecognized ownership "${raw.ownership}" — defaulted to 1st Owner`);
  const furnishing = pickEnum(raw.furnishing, FURNISHINGS, 'Unfurnished');
  if (furnishing.corrected) warnings.push(`Unrecognized furnishing "${raw.furnishing}" — defaulted to Unfurnished`);
  const priceType = pickEnum(raw.price_type, PRICE_TYPES, 'fixed');
  if (priceType.corrected) warnings.push(`Unrecognized price_type "${raw.price_type}" — defaulted to fixed`);
  const status = pickEnum(raw.status, STATUSES, 'available');
  if (status.corrected) warnings.push(`Unrecognized status "${raw.status}" — defaulted to available`);
  const demandTag = pickEnum(raw.demand_tag, DEMAND_TAGS, 'moderate');
  if (demandTag.corrected) warnings.push(`Unrecognized demand_tag "${raw.demand_tag}" — defaulted to moderate`);
  const bhk = pickEnum(raw.bhk, BHKS, '1');
  if (bhk.corrected && raw.bhk?.trim()) warnings.push(`Unrecognized bhk "${raw.bhk}" — defaulted to 1`);

  const agentName = (raw.primary_agent || '').trim();
  const matchedAgent = agentName ? agents.find(a => a.name.toLowerCase() === agentName.toLowerCase()) : undefined;
  if (agentName && !matchedAgent) warnings.push(`Agent "${agentName}" not found — pick one below`);

  const carpetArea = raw.carpet_area?.trim();
  if (carpetArea && isNaN(parseFloat(carpetArea))) warnings.push(`carpet_area "${carpetArea}" isn't a number — cleared`);
  const builtUpArea = raw.built_up_area?.trim();
  if (builtUpArea && isNaN(parseFloat(builtUpArea))) warnings.push(`built_up_area "${builtUpArea}" isn't a number — cleared`);

  return {
    key: crypto.randomUUID(),
    rowNumber,
    fields: {
      title: (raw.title || '').trim(),
      description: raw.description || '',
      property_type: propertyType.value,
      listing_type: listingType.value,
      ownership: ownership.value,
      bhk: bhk.value,
      furnishing: furnishing.value,
      carpet_area: carpetArea && !isNaN(parseFloat(carpetArea)) ? carpetArea : '',
      built_up_area: builtUpArea && !isNaN(parseFloat(builtUpArea)) ? builtUpArea : '',
      floor: raw.floor || '',
      possession: raw.possession || '',
      price: (raw.price || '').trim(),
      price_type: priceType.value,
      location_address: (raw.location_address || '').trim(),
      city: raw.city || '',
      locality: raw.locality || '',
      rera_number: raw.rera_number || '',
      demand_tag: demandTag.value,
      status: status.value,
      primary_agent_name: agentName,
      primary_agent_id: matchedAgent?.id || '',
      amenities: splitList(raw.amenities),
      highlights: splitList(raw.highlights),
      nearbyPlaces: parseNearby(raw.nearby_places),
      csvImageUrls: splitList(raw.image_urls),
      csvVideoUrls: splitList(raw.video_urls),
      youtube_url: (raw.youtube_url || '').trim(),
    },
    warnings,
    uploadedImageUrls: [],
    imageCaptions: {},
    uploadedVideoUrls: [],
    imageUploads: [],
    videoUploads: [],
    expanded: false,
    saveStatus: 'pending',
  };
}

function rowErrors(row: ImportRow): string[] {
  const errs: string[] = [];
  if (!row.fields.title.trim()) errs.push('Title is required');
  const priceNum = parseFloat(row.fields.price);
  if (!row.fields.price.trim() || isNaN(priceNum) || priceNum <= 0) errs.push('Price is required and must be a number greater than 0');
  if (!row.fields.location_address.trim()) errs.push('Address is required');
  if (!row.fields.primary_agent_id) errs.push('Primary agent must be selected');
  return errs;
}

// Doesn't block saving (two genuinely different properties can share a
// name), but flagged loudly — this is the safeguard for "I re-uploaded the
// same file / left old rows in it" rather than a hard rule.
function duplicateReason(row: ImportRow, existingTitles: Set<string>, allRows: ImportRow[]): string | null {
  const title = row.fields.title.trim().toLowerCase();
  if (!title) return null;
  if (existingTitles.has(title)) return 'A property with this exact title already exists in your listings.';
  const dupeInFile = allRows.some(r => r.key !== row.key && r.fields.title.trim().toLowerCase() === title);
  if (dupeInFile) return 'Another row in this same file has the same title.';
  return null;
}

export function ImportClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<{ id: string; name: string; company: string }[]>([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [existingTitles, setExistingTitles] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSummary, setSaveSummary] = useState<{ saved: number; failed: number } | null>(null);

  useEffect(() => {
    getAgentsForSelect().then(a => { setAgents(a); setAgentsLoaded(true); });
    getExistingPropertyTitles().then(titles => setExistingTitles(new Set(titles.map(t => t.trim().toLowerCase()))));
  }, []);

  const applyParsedRows = (rawRows: Record<string, string>[]) => {
    const data = rawRows
      .map(remapHeaders)
      .filter(r => Object.values(r).some(v => (v || '').trim()));
    if (!data.length) {
      setParseError('No property rows found in that file.');
      return;
    }
    setRows(data.map((raw, i) => buildRow(raw, i + 2, agents)));
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParseError(null);
    setSaveSummary(null);

    const isExcel = /\.xlsx$/i.test(file.name) || file.type.includes('spreadsheetml');
    if (isExcel) {
      file.arrayBuffer().then(buffer => {
        try {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
          applyParsedRows(data);
        } catch {
          setParseError("Couldn't read that Excel file — make sure it's a .xlsx saved from the downloaded template.");
        }
      }).catch(() => setParseError("Couldn't read that file."));
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          setParseError(results.errors[0].message);
          return;
        }
        applyParsedRows(results.data);
      },
      error: (err) => setParseError(err.message),
    });
  };

  const handleClear = () => {
    setRows([]);
    setParseError(null);
    setSaveSummary(null);
  };

  // Re-resolve agent matches if the CSV was parsed before agents finished loading.
  useEffect(() => {
    if (!agentsLoaded || rows.length === 0) return;
    setRows(prev => prev.map(r => {
      if (r.fields.primary_agent_id || !r.fields.primary_agent_name) return r;
      const matched = agents.find(a => a.name.toLowerCase() === r.fields.primary_agent_name.toLowerCase());
      return matched ? { ...r, fields: { ...r.fields, primary_agent_id: matched.id } } : r;
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentsLoaded]);

  const updateRow = (key: string, patch: Partial<Fields>) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, fields: { ...r.fields, ...patch } } : r));
  };

  const toggleExpanded = (key: string) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, expanded: !r.expanded } : r));
  };

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  };

  const uploadFiles = async (
    rowKey: string,
    files: FileList,
    kind: 'image' | 'video',
  ) => {
    const items: UploadItem[] = Array.from(files).map(f => ({ id: crypto.randomUUID(), name: f.name, status: 'uploading' }));
    const uploadsKey = kind === 'image' ? 'imageUploads' : 'videoUploads';
    setRows(prev => prev.map(r => r.key === rowKey ? { ...r, [uploadsKey]: [...r[uploadsKey], ...items] } : r));

    await Promise.all(Array.from(files).map(async (file, i) => {
      const item = items[i];
      try {
        const url = await uploadPropertyMedia(file, kind);
        setRows(prev => prev.map(r => {
          if (r.key !== rowKey) return r;
          const urlsKey = kind === 'image' ? 'uploadedImageUrls' : 'uploadedVideoUrls';
          const suggestedCaption = kind === 'image' ? deriveCaptionFromFilename(file.name) : '';
          return {
            ...r,
            [urlsKey]: [...r[urlsKey], url],
            imageCaptions: suggestedCaption ? { ...r.imageCaptions, [url]: suggestedCaption } : r.imageCaptions,
            [uploadsKey]: r[uploadsKey].map(u => u.id === item.id ? { ...u, status: 'done' as const } : u),
          };
        }));
      } catch (err) {
        const message = err instanceof UploadError ? err.message : 'Upload failed';
        setRows(prev => prev.map(r => r.key === rowKey
          ? { ...r, [uploadsKey]: r[uploadsKey].map(u => u.id === item.id ? { ...u, status: 'error' as const, error: message } : u) }
          : r));
      }
    }));
  };

  const readyCount = rows.filter(r => rowErrors(r).length === 0).length;

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSummary(null);
    let saved = 0, failed = 0;

    for (const row of rows) {
      if (rowErrors(row).length > 0) continue;
      setRows(prev => prev.map(r => r.key === row.key ? { ...r, saveStatus: 'saving' } : r));

      const fd = new FormData();
      fd.set('title', row.fields.title);
      fd.set('description', row.fields.description);
      fd.set('property_type', row.fields.property_type);
      fd.set('listing_type', row.fields.listing_type);
      fd.set('ownership', row.fields.ownership);
      fd.set('bhk', row.fields.bhk);
      fd.set('furnishing', row.fields.furnishing);
      fd.set('carpet_area', row.fields.carpet_area);
      fd.set('built_up_area', row.fields.built_up_area);
      fd.set('floor', row.fields.floor);
      fd.set('possession', row.fields.possession);
      fd.set('price', row.fields.price);
      fd.set('price_type', row.fields.price_type);
      fd.set('location_address', row.fields.location_address);
      fd.set('city', row.fields.city);
      fd.set('locality', row.fields.locality);
      fd.set('rera_number', row.fields.rera_number);
      fd.set('demand_tag', row.fields.demand_tag);
      fd.set('status', row.fields.status);
      fd.set('primary_agent_id', row.fields.primary_agent_id);
      fd.set('amenities', JSON.stringify(row.fields.amenities));
      fd.set('highlights', JSON.stringify(row.fields.highlights));
      fd.set('image_urls', JSON.stringify([...row.fields.csvImageUrls, ...row.uploadedImageUrls]));
      fd.set('image_captions', JSON.stringify([
        ...row.fields.csvImageUrls.map(() => ''),
        ...row.uploadedImageUrls.map(url => row.imageCaptions[url] || ''),
      ]));
      fd.set('video_urls', JSON.stringify([...row.fields.csvVideoUrls, ...row.uploadedVideoUrls]));
      fd.set('youtube_url', row.fields.youtube_url);
      fd.set('nearby_places', JSON.stringify(row.fields.nearbyPlaces));

      const result = await createProperty(fd);
      if (result?.error) {
        failed++;
        setRows(prev => prev.map(r => r.key === row.key ? { ...r, saveStatus: 'error', saveError: result.error } : r));
      } else {
        saved++;
        setRows(prev => prev.map(r => r.key === row.key ? { ...r, saveStatus: 'saved' } : r));
      }
    }

    setSaving(false);
    setSaveSummary({ saved, failed });
    if (failed === 0 && rows.length > 0 && rows.every(r => rowErrors(r).length === 0)) {
      router.refresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/properties" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </Link>
        <h1 className="text-xl font-bold text-navy dark:text-white">Bulk Import Properties</h1>
      </div>

      {/* Step 1: template */}
      <Card title="1. Download the template">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          One row per property. It downloads as a formatted Excel file — bold header row, columns already sized —
          so you can just open it and start typing, no manual formatting. Lists (amenities, highlights, video/image URLs)
          go in a single cell separated by <span className="font-mono text-navy dark:text-white">;</span>
          — e.g. <span className="font-mono">Gym;Pool;24x7 Security</span>. Nearby landmarks use
          <span className="font-mono text-navy dark:text-white"> Name:Distance</span> pairs separated by <span className="font-mono">;</span>.
          <span className="font-medium text-navy dark:text-white"> Primary Agent</span> must exactly match a name already in Agents.
          Photos don&apos;t have to go in the file — leave <span className="font-mono">Image URLs</span> blank and upload the actual files per property in the review step below.
        </p>
        <a href="/api/admin/properties/import-template" className="h-10 px-4 bg-primary hover:bg-teal-700 text-white font-semibold rounded-lg text-sm transition-all inline-flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" /> Download template (.xlsx)
        </a>
      </Card>

      {/* Step 2: upload */}
      <div className="mt-5">
        <Card title="2. Upload your filled file">
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFileSelected} />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full h-20 rounded-lg border-2 border-dashed border-gray-200/60 dark:border-gray-800/60 hover:border-primary hover:bg-teal-50/40 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors">
            <Upload className="w-5 h-5" />
            <span className="text-xs font-medium">Click to choose the filled .xlsx or .csv file</span>
          </button>
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            This file is read entirely in your browser — it&apos;s never uploaded to or stored on our servers. Only the property details you confirm below get saved.
          </p>
          {parseError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
            </div>
          )}
        </Card>
      </div>

      {/* Step 3: review */}
      {rows.length > 0 && (
        <div className="mt-5">
          <Card title={`3. Review & verify — ${rows.length} propert${rows.length === 1 ? 'y' : 'ies'} parsed, ${readyCount} ready`}>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={handleClear} className="text-xs font-semibold text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Clear & start over
              </button>
            </div>
            <div className="space-y-3">
              {rows.map(row => {
                const errs = rowErrors(row);
                const dupe = duplicateReason(row, existingTitles, rows);
                return (
                  <RowCard
                    key={row.key}
                    row={row}
                    errors={errs}
                    duplicateReason={dupe}
                    agents={agents}
                    onToggle={() => toggleExpanded(row.key)}
                    onRemove={() => removeRow(row.key)}
                    onChange={(patch) => updateRow(row.key, patch)}
                    onUploadImages={(files) => uploadFiles(row.key, files, 'image')}
                    onUploadVideos={(files) => uploadFiles(row.key, files, 'video')}
                    onClearImageUploads={() => setRows(prev => prev.map(r => r.key === row.key ? { ...r, imageUploads: r.imageUploads.filter(u => u.status === 'uploading') } : r))}
                    onClearVideoUploads={() => setRows(prev => prev.map(r => r.key === row.key ? { ...r, videoUploads: r.videoUploads.filter(u => u.status === 'uploading') } : r))}
                    onRemoveUploadedImage={(url) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, uploadedImageUrls: r.uploadedImageUrls.filter(u => u !== url) } : r))}
                    onRemoveCsvImage={(url) => updateRow(row.key, { csvImageUrls: row.fields.csvImageUrls.filter(u => u !== url) })}
                    onCaptionChange={(url, caption) => setRows(prev => prev.map(r => r.key === row.key ? { ...r, imageCaptions: { ...r.imageCaptions, [url]: caption } } : r))}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Sticky save bar */}
      {rows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-56 bg-white dark:bg-navy-900 border-t border-gray-100/60 dark:border-gray-800/60 p-4 flex items-center justify-between gap-3 z-30">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {saveSummary
              ? <span>{saveSummary.saved} saved{saveSummary.failed > 0 ? `, ${saveSummary.failed} failed` : ''}</span>
              : <span>{readyCount} of {rows.length} ready to save</span>}
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving || readyCount === 0}
            className="h-10 px-5 bg-primary hover:bg-teal-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : `Save ${readyCount} Ready Propert${readyCount === 1 ? 'y' : 'ies'}`}
          </button>
        </div>
      )}
    </div>
  );
}

function RowCard({
  row, errors, duplicateReason, agents, onToggle, onRemove, onChange,
  onUploadImages, onUploadVideos, onClearImageUploads, onClearVideoUploads,
  onRemoveUploadedImage, onRemoveCsvImage, onCaptionChange,
}: {
  row: ImportRow;
  errors: string[];
  duplicateReason: string | null;
  agents: { id: string; name: string; company: string }[];
  onToggle: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<Fields>) => void;
  onUploadImages: (files: FileList) => void;
  onUploadVideos: (files: FileList) => void;
  onClearImageUploads: () => void;
  onClearVideoUploads: () => void;
  onRemoveUploadedImage: (url: string) => void;
  onRemoveCsvImage: (url: string) => void;
  onCaptionChange: (url: string, caption: string) => void;
}) {
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const totalPhotos = row.fields.csvImageUrls.length + row.uploadedImageUrls.length;
  const ready = errors.length === 0;

  const statusBadge = row.saveStatus === 'saved'
    ? <span className="h-6 px-2 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-[11px] font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>
    : row.saveStatus === 'saving'
    ? <span className="h-6 px-2 rounded-full bg-teal-50 dark:bg-teal-950/40 text-primary text-[11px] font-bold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>
    : row.saveStatus === 'error'
    ? <span className="h-6 px-2 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[11px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
    : ready
    ? <span className="h-6 px-2 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-[11px] font-bold">Ready</span>
    : <span className="h-6 px-2 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[11px] font-bold">{errors.length} issue{errors.length > 1 ? 's' : ''}</span>;

  return (
    <div className={`rounded-xl border ${!ready ? 'border-red-200 dark:border-red-900' : duplicateReason ? 'border-amber-300 dark:border-amber-800' : 'border-gray-200/60 dark:border-gray-800/60'} overflow-hidden`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 w-10 shrink-0">Row {row.rowNumber}</span>
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-navy dark:text-white">{row.fields.title || <em className="text-gray-400 font-normal">Untitled</em>}</span>
        <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 shrink-0">{row.fields.price ? `₹${row.fields.price}` : '—'}</span>
        <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 shrink-0">{row.fields.city || '—'}</span>
        <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 shrink-0"><ImageIcon className="w-3.5 h-3.5" /> {totalPhotos}</span>
        {duplicateReason && (
          <span className="h-6 px-2 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
            <AlertTriangle className="w-3 h-3" /> Possible duplicate
          </span>
        )}
        {statusBadge}
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 flex items-center justify-center shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {row.expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      {row.expanded && (
        <div className="p-4 border-t border-gray-100/60 dark:border-gray-800/60 space-y-4">
          {duplicateReason && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs rounded-lg border border-amber-200 dark:border-amber-900">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {duplicateReason} Saving will still create a new, separate listing — remove this row if that&apos;s not what you want.
            </div>
          )}
          {(errors.length > 0 || row.warnings.length > 0) && (
            <div className="space-y-1.5">
              {errors.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {e}</div>
              ))}
              {row.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {w}</div>
              ))}
            </div>
          )}
          {row.saveStatus === 'error' && row.saveError && (
            <div className="p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs rounded-lg">Save failed: {row.saveError}</div>
          )}

          <div className="grid grid-cols-6 gap-x-3 gap-y-3">
            <div className="col-span-6">
              <label className={labelCls}>Title</label>
              <input value={row.fields.title} onChange={e => onChange({ title: e.target.value })} className={input} />
            </div>
            <div className="col-span-6">
              <label className={labelCls}>Description</label>
              <textarea value={row.fields.description} onChange={e => onChange({ description: e.target.value })} rows={2} className={textarea} />
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>Type</label>
              <select value={row.fields.property_type} onChange={e => onChange({ property_type: e.target.value })} className={input}>
                {PROPERTY_TYPES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>Listing Type</label>
              <select value={row.fields.listing_type} onChange={e => onChange({ listing_type: e.target.value })} className={input}>
                {LISTING_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>BHK</label>
              <select value={row.fields.bhk} onChange={e => onChange({ bhk: e.target.value })} className={input}>
                {BHKS.map(o => <option key={o} value={o}>{o} BHK</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>Price (₹)</label>
              <input type="number" value={row.fields.price} onChange={e => onChange({ price: e.target.value })} className={input} />
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>Price Type</label>
              <select value={row.fields.price_type} onChange={e => onChange({ price_type: e.target.value })} className={input}>
                {PRICE_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-2">
              <label className={labelCls}>Status</label>
              <select value={row.fields.status} onChange={e => onChange({ status: e.target.value })} className={input}>
                {STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Carpet (sqft)</label>
              <input value={row.fields.carpet_area} onChange={e => onChange({ carpet_area: e.target.value })} className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Super Area</label>
              <input value={row.fields.built_up_area} onChange={e => onChange({ built_up_area: e.target.value })} className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Floor</label>
              <input value={row.fields.floor} onChange={e => onChange({ floor: e.target.value })} className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Possession</label>
              <input value={row.fields.possession} onChange={e => onChange({ possession: e.target.value })} className={input} />
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Furnishing</label>
              <select value={row.fields.furnishing} onChange={e => onChange({ furnishing: e.target.value })} className={input}>
                {FURNISHINGS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Ownership</label>
              <select value={row.fields.ownership} onChange={e => onChange({ ownership: e.target.value })} className={input}>
                {OWNERSHIPS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-3 md:col-span-1">
              <label className={labelCls}>Demand</label>
              <select value={row.fields.demand_tag} onChange={e => onChange({ demand_tag: e.target.value })} className={input}>
                {DEMAND_TAGS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>RERA Number</label>
              <input value={row.fields.rera_number} onChange={e => onChange({ rera_number: e.target.value })} className={input} />
            </div>
            <div className="col-span-6">
              <label className={labelCls}>Full Address</label>
              <input value={row.fields.location_address} onChange={e => onChange({ location_address: e.target.value })} className={input} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>City</label>
              <input value={row.fields.city} onChange={e => onChange({ city: e.target.value })} className={input} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Locality</label>
              <input value={row.fields.locality} onChange={e => onChange({ locality: e.target.value })} className={input} />
            </div>
            <div className="col-span-6">
              <label className={labelCls}>Primary Agent</label>
              <select value={row.fields.primary_agent_id} onChange={e => onChange({ primary_agent_id: e.target.value })} className={input}>
                <option value="">— Select —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.company ? ` — ${a.company}` : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Amenities / Highlights / Nearby */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amenities (separate with ;)</label>
              <input value={row.fields.amenities.join(';')} onChange={e => onChange({ amenities: splitList(e.target.value) })} className={input} />
            </div>
            <div>
              <label className={labelCls}>Highlights (separate with ;)</label>
              <input value={row.fields.highlights.join(';')} onChange={e => onChange({ highlights: splitList(e.target.value) })} className={input} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Nearby Landmarks</label>
            <div className="space-y-2">
              {row.fields.nearbyPlaces.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="ITPL Tech Park" value={p.name} onChange={e => {
                    const u = [...row.fields.nearbyPlaces]; u[i] = { ...u[i], name: e.target.value }; onChange({ nearbyPlaces: u });
                  }} className={input + " flex-1"} />
                  <input placeholder="0.5 km" value={p.distance} onChange={e => {
                    const u = [...row.fields.nearbyPlaces]; u[i] = { ...u[i], distance: e.target.value }; onChange({ nearbyPlaces: u });
                  }} className={input + " !w-24"} />
                  <button type="button" onClick={() => onChange({ nearbyPlaces: row.fields.nearbyPlaces.filter((_, j) => j !== i) })} className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => onChange({ nearbyPlaces: [...row.fields.nearbyPlaces, { name: '', distance: '' }] })} className="mt-2 text-xs font-semibold text-primary hover:text-teal-700 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add landmark
            </button>
          </div>

          {/* Photos */}
          <div className="pt-3 border-t border-gray-100/60 dark:border-gray-800/60">
            <label className={labelCls}><ImageIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Photos</label>
            <input ref={imageFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) onUploadImages(e.target.files); e.target.value = ''; }} />
            <button type="button" onClick={() => imageFileRef.current?.click()}
              className="w-full h-16 rounded-lg border-2 border-dashed border-gray-200/60 dark:border-gray-800/60 hover:border-primary hover:bg-teal-50/40 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-xs font-medium">Upload photos for this property</span>
            </button>
            {row.imageUploads.length > 0 && <UploadQueueList items={row.imageUploads} onClear={onClearImageUploads} />}
            {(row.fields.csvImageUrls.length > 0 || row.uploadedImageUrls.length > 0) && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-3">
                {row.fields.csvImageUrls.map((url, i) => (
                  <div key={`csv-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 aspect-[4/3]">
                    <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button type="button" onClick={() => onRemoveCsvImage(url)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {row.uploadedImageUrls.map((url, i) => (
                  <div key={`up-${i}`} className="rounded-lg overflow-hidden border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800">
                    <div className="relative group aspect-[4/3]">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => onRemoveUploadedImage(url)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      value={row.imageCaptions[url] || ''}
                      onChange={e => onCaptionChange(url, e.target.value)}
                      placeholder="e.g. Master Bedroom"
                      className="w-full px-1.5 py-1 text-[10px] bg-transparent border-t border-gray-200/60 dark:border-gray-800/60 focus:outline-none focus:bg-white dark:focus:bg-navy-900 text-navy dark:text-white placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="pt-3 border-t border-gray-100/60 dark:border-gray-800/60">
            <label className={labelCls}><Film className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />Videos (optional)</label>
            <input ref={videoFileRef} type="file" accept="video/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) onUploadVideos(e.target.files); e.target.value = ''; }} />
            <button type="button" onClick={() => videoFileRef.current?.click()}
              className="w-full h-16 rounded-lg border-2 border-dashed border-gray-200/60 dark:border-gray-800/60 hover:border-primary hover:bg-teal-50/40 dark:hover:bg-teal-950/20 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-xs font-medium">Upload walkthrough videos</span>
            </button>
            {row.videoUploads.length > 0 && <UploadQueueList items={row.videoUploads} onClear={onClearVideoUploads} />}
            <div className="mt-2">
              <label className={labelCls}>YouTube URL</label>
              <input value={row.fields.youtube_url} onChange={e => onChange({ youtube_url: e.target.value })} className={input} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>
        </div>
      )}
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

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import {
  ArrowLeft, Heart, Share2, MapPin, CheckCircle, Sparkles, Phone,
  Building2, Maximize, Layers, Calendar, Tag, UserCheck,
  Car, Trees, Dumbbell, Wifi, Droplets, Zap, ShieldCheck
} from 'lucide-react';
import { getPropertyBySlug, submitEnquiry, logWhatsAppLead } from '../actions';
import { EMICalculator } from '@/components/emi-calculator';
import { AppreciationPredictor } from '@/components/appreciation-predictor';
import { LoginPromptModal } from '@/components/login-prompt-modal';
import { createClient } from '@/utils/supabase/client';

const amenityLabels: Record<string, { icon: any; label: string }> = {
  covered_parking: { icon: Car, label: '2 Covered Parking' },
  smart_home: { icon: Wifi, label: 'Smart Home Ready' },
  water_supply: { icon: Droplets, label: '24/7 Water Supply' },
  power_backup: { icon: Zap, label: 'Power Backup' },
  open_space: { icon: Trees, label: 'Open Space' },
  gym_pool: { icon: Dumbbell, label: 'Gym & Pool' },
  security: { icon: ShieldCheck, label: '24/7 Security' },
  clubhouse: { icon: Building2, label: 'Clubhouse' },
  garden: { icon: Trees, label: 'Garden' },
  jogging_track: { icon: Trees, label: 'Jogging Track' },
  play_area: { icon: Trees, label: 'Play Area' },
  ev_charging: { icon: Zap, label: 'EV Charging' },
  rainwater: { icon: Droplets, label: 'Rainwater Harvesting' },
  intercom: { icon: Wifi, label: 'Intercom' },
  cctv: { icon: ShieldCheck, label: 'CCTV' },
  indoor_games: { icon: Dumbbell, label: 'Indoor Games' },
};

// Admin can type in an amenity that isn't in the predefined list above —
// those are stored with the raw text as both id and label, so anything
// missing from the map falls back to showing that raw text with a generic
// icon instead of silently disappearing.
function resolveAmenity(amenityId: string): { icon: any; label: string } {
  return amenityLabels[amenityId] || { icon: CheckCircle, label: amenityId };
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquirySubmitted, setEnquirySubmitted] = useState(false);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [copiedShare, setCopiedShare] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [enquiryPrefill, setEnquiryPrefill] = useState({ name: '', phone: '', email: '' });
  const [showWhatsAppPhoneModal, setShowWhatsAppPhoneModal] = useState(false);
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState('');
  const [whatsappPhoneError, setWhatsappPhoneError] = useState<string | null>(null);
  const [whatsappSubmitting, setWhatsappSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setIsLoggedIn(!!data.user);
      if (!data.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', data.user.id)
        .single();

      setEnquiryPrefill({
        name: profile?.full_name || data.user.user_metadata?.full_name || '',
        phone: profile?.phone || '',
        email: data.user.email || '',
      });
    });
  }, []);

  // Enquire and WhatsApp contact require a logged-in account so leads
  // are always tied to a real user we can follow up with. Returns true
  // (and pops the login prompt) when the action should be blocked.
  const requireLogin = () => {
    if (isLoggedIn === false) {
      setShowLoginGate(true);
      return true;
    }
    return false;
  };

  useEffect(() => {
    getPropertyBySlug(slug).then(data => {
      setProperty(data);
      setLoading(false);

      if (data) {
        // Track viewed property in localStorage for profile stats
        try {
          const viewed: string[] = JSON.parse(localStorage.getItem('roofmint_viewed_history') || '[]');
          if (!viewed.includes(data.id)) {
            const updated = [data.id, ...viewed].slice(0, 100);
            localStorage.setItem('roofmint_viewed_history', JSON.stringify(updated));
          }
        } catch {}

        // Check if saved
        try {
          const saved: string[] = JSON.parse(localStorage.getItem('roofmint_saved_ids') || '[]');
          setIsSaved(saved.includes(data.id));
        } catch {}
      }
    });
  }, [slug]);

  const toggleSave = async () => {
    if (!property) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      const saved: string[] = JSON.parse(localStorage.getItem('roofmint_saved_ids') || '[]');
      let updated: string[];
      if (nextSaved) {
        updated = Array.from(new Set([...saved, property.id]));
      } else {
        updated = saved.filter(id => id !== property.id);
      }
      localStorage.setItem('roofmint_saved_ids', JSON.stringify(updated));

      // Sync with Supabase if logged in
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (nextSaved) {
          await supabase.from('starred_properties').upsert({ user_id: user.id, property_id: property.id });
        } else {
          await supabase.from('starred_properties').delete().eq('user_id', user.id).eq('property_id', property.id);
        }
      }
    } catch {}
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: property?.title || 'Roofmint Listing',
          text: `Check out ${property?.title} on Roofmint!`,
          url: window.location.href,
        });
        return;
      } catch {}
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  const validateEnquiry = (fd: FormData): string | null => {
    const name = ((fd.get('name') as string) || '').trim();
    const phone = ((fd.get('phone') as string) || '').trim();
    const email = ((fd.get('email') as string) || '').trim();

    if (name.length < 2) return 'Please enter your full name.';
    if (!/[A-Za-z]/.test(name)) return 'Name must contain letters, not just numbers or symbols.';

    const phoneDigits = phone.replace(/[\s-]/g, '');
    if (!/^(\+?91)?[6-9]\d{9}$/.test(phoneDigits)) {
      return 'Please enter a valid 10-digit mobile number.';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }

    return null;
  };

  const handleEnquirySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Honeypot tripped — pretend success without actually submitting, so
    // the bot doesn't learn to skip this field next time.
    if ((fd.get('company_website') as string || '').trim()) {
      setEnquirySubmitted(true);
      return;
    }

    const validationError = validateEnquiry(fd);
    if (validationError) {
      setEnquiryError(validationError);
      return;
    }
    setEnquiryError(null);

    setSubmitting(true);
    fd.append('property_id', property.id);
    try {
      await submitEnquiry(fd);
      setEnquirySubmitted(true);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '';
      setEnquiryError(msg.includes('Too many enquiries') ? msg : 'Something went wrong submitting your enquiry. Please try again.');
    }
    setSubmitting(false);
  };

  // Once we already have valid saved contact details for this user, skip
  // asking again on every property — submit straight away using them.
  const openEnquiry = async () => {
    if (requireLogin()) return;

    const fd = new FormData();
    fd.append('name', enquiryPrefill.name);
    fd.append('phone', enquiryPrefill.phone);
    fd.append('email', enquiryPrefill.email);

    if (validateEnquiry(fd)) {
      // No usable saved details yet (first time, or an incomplete profile) — ask once.
      setShowEnquiryModal(true);
      return;
    }

    setShowEnquiryModal(true);
    setEnquiryError(null);
    setSubmitting(true);
    fd.append('property_id', property.id);
    fd.append('budget_hint', '');
    fd.append('message', '');
    try {
      await submitEnquiry(fd);
      setEnquirySubmitted(true);
    } catch (err) {
      console.error(err);
      // Fall back to the form so they can retry manually instead of a dead end.
      setEnquiryError('Something went wrong submitting your enquiry. Please try again.');
    }
    setSubmitting(false);
  };

  const getWaLink = () =>
    `https://wa.me/917096867438?text=${encodeURIComponent(`Hi Roofmint, I'm interested in ${property.title} (${property.formattedPrice}) located at ${property.location_address}. Please share details.`)}`;

  // We can only log a WhatsApp click as a lead with a real number to give
  // an agent — if the profile has none (common for Google sign-ins, which
  // never collect a phone), ask for it in a one-field popup first instead
  // of silently creating an unreachable lead.
  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (requireLogin()) return;

    const phoneDigits = enquiryPrefill.phone.replace(/[\s-]/g, '');
    if (/^(\+?91)?[6-9]\d{9}$/.test(phoneDigits)) {
      logWhatsAppLead(property.id);
      window.open(getWaLink(), '_blank', 'noopener,noreferrer');
    } else {
      setWhatsappPhoneInput('');
      setWhatsappPhoneError(null);
      setShowWhatsAppPhoneModal(true);
    }
  };

  const handleWhatsAppPhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const digits = whatsappPhoneInput.replace(/[\s-]/g, '');
    if (!/^(\+?91)?[6-9]\d{9}$/.test(digits)) {
      setWhatsappPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setWhatsappSubmitting(true);
    await logWhatsAppLead(property.id, digits);
    setEnquiryPrefill(prev => ({ ...prev, phone: digits }));
    setWhatsappSubmitting(false);
    setShowWhatsAppPhoneModal(false);
    window.open(getWaLink(), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold text-navy dark:text-white">Property not found</h2>
        <Link href="/" className="text-primary font-medium hover:underline">← Back to listings</Link>
      </div>
    );
  }

  const images = property.images?.length > 0 ? property.images : ['/images/property1.png'];

  return (
    <div className="bg-white dark:bg-navy-900 min-h-screen max-w-[480px] md:max-w-none xl:max-w-7xl mx-auto relative pb-32 md:pb-12 md:pt-6">
      {/* Enquiry Modal */}
      {showEnquiryModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {enquirySubmitted ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-extrabold text-navy dark:text-white mb-4">Request Sent!</h2>
                <p className="text-gray-600 dark:text-gray-300 text-base mb-8 leading-relaxed">
                  Thank you for your interest in <span className="font-semibold text-navy dark:text-white">{property.title}</span>. Our team will reach out within 24 hours.
                </p>
                <button onClick={() => { setShowEnquiryModal(false); setEnquirySubmitted(false); setEnquiryError(null); }}
                  className="w-full h-12 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-all">
                  Continue Exploring
                </button>
              </div>
            ) : submitting && !enquiryError ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Sending your enquiry using your saved details...</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-navy dark:text-white mb-1">Enquire about {property.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Fill in your details and we&apos;ll get back to you</p>
                {enquiryError && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                    {enquiryError}
                  </div>
                )}
                <form onSubmit={handleEnquirySubmit} className="space-y-3">
                  {/* Honeypot — invisible to real visitors, but a generic
                      bot that auto-fills every field will fill this too.
                      Off-screen rather than display:none, since some bots
                      specifically skip display:none fields. */}
                  <input
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px opacity-0"
                  />
                  <input name="name" required minLength={2} maxLength={80} defaultValue={enquiryPrefill.name} placeholder="Full Name *" className="w-full h-11 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <input name="phone" required type="tel" inputMode="numeric" maxLength={13} defaultValue={enquiryPrefill.phone} placeholder="10-digit Mobile Number *" className="w-full h-11 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <input name="email" type="email" defaultValue={enquiryPrefill.email} placeholder="Email (optional)" className="w-full h-11 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <input name="budget_hint" maxLength={40} placeholder="Budget Range (e.g. ₹1-1.5 Cr)" className="w-full h-11 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <textarea name="message" maxLength={500} placeholder="Any specific requirements..." rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowEnquiryModal(false); setEnquiryError(null); }}
                      className="flex-1 h-12 border border-gray-200/60 dark:border-gray-800/60 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 h-12 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                      {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Phone className="w-4 h-4" />}
                      {submitting ? 'Sending...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gallery Section */}
      <div className="md:px-8 md:grid md:grid-cols-[3fr_1fr] md:gap-4 md:mb-8">
        <div className="relative h-[280px] md:h-[500px] md:rounded-2xl overflow-hidden bg-gray-100 dark:bg-navy-800 shadow-sm">
          <Image src={images[currentImage]} alt={property.title} fill className="object-cover" priority />
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 md:p-6">
            <Link href="/" className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/90 dark:bg-navy-900 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-800 dark:text-gray-200" />
            </Link>
            <div className="flex gap-2 md:gap-3">
              <button onClick={toggleSave} className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/90 dark:bg-navy-900 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-105 transition-transform" title={isSaved ? 'Remove from Saved' : 'Save Property'}>
                <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isSaved ? 'fill-red-500 text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`} />
              </button>
              <button onClick={handleShare} className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/90 dark:bg-navy-900 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-105 transition-transform relative" title="Share Link">
                <Share2 className="w-4 h-4 md:w-5 md:h-5 text-gray-800 dark:text-gray-200" />
                {copiedShare && (
                  <span className="absolute -bottom-8 right-0 bg-navy text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                    Link Copied!
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="absolute top-4 md:top-6 left-16 md:left-20 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm text-white text-[10px] md:text-xs font-semibold px-2.5 py-1 md:px-3 md:py-1.5 rounded-full">
            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> Verified Property
          </div>
          <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 bg-black/60 text-white text-[11px] md:text-sm font-medium px-2.5 py-1 md:px-4 md:py-1.5 rounded-full backdrop-blur-sm">
            {currentImage + 1}/{images.length}
          </div>
        </div>
        <div className="flex md:flex-col gap-2 md:gap-4 px-4 md:px-0 py-3 md:py-0 overflow-x-auto md:overflow-y-auto md:h-[500px] no-scrollbar">
          {images.map((img: string, idx: number) => (
            <button key={idx} onClick={() => setCurrentImage(idx)}
              className={`relative w-16 h-12 md:w-full md:flex-1 md:min-h-[120px] rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                currentImage === idx ? 'ring-2 md:ring-4 ring-primary ring-offset-1 md:ring-offset-2' : 'opacity-60 hover:opacity-100'
              }`}>
              <Image src={img} alt={`View ${idx + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Property Video(s) */}
      {property.videos?.length > 0 && (
        <div className="md:px-8 px-4 mb-5 md:mb-8 space-y-4">
          <h2 className="text-base md:text-xl font-bold text-navy dark:text-white">Property Video</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {property.videos.map((video: { url: string; type: string }, idx: number) => {
              const embedUrl = video.type === 'video_youtube' ? getYoutubeEmbedUrl(video.url) : null;
              return (
                <div key={idx} className="relative rounded-xl md:rounded-2xl overflow-hidden bg-black aspect-video shadow-sm">
                  {video.type === 'video_youtube' ? (
                    embedUrl ? (
                      <iframe src={embedUrl} title={`${property.title} video ${idx + 1}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : (
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-full text-white text-sm underline">Watch video</a>
                    )
                  ) : (
                    <video src={video.url} controls className="w-full h-full object-contain" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="md:px-8 md:flex md:gap-12 md:items-start">
        <div className="px-4 md:px-0 space-y-5 md:space-y-6 flex-1">
          {/* Title & Price */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> {property.listingTypeLabel || 'For Sale'}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> {property.ownershipLabel || '1st Owner'}
              </span>
            </div>
            <h1 className="text-xl md:text-4xl font-bold text-navy dark:text-white">{property.title}</h1>
            <div className="flex items-baseline gap-2 mt-1 md:hidden">
              <span className="text-xl font-bold text-primary">{property.formattedPrice}</span>
              {property.priceLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{property.priceLabel}</span>}
            </div>
            <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-3">
              <MapPin className="w-3.5 h-3.5 md:w-5 md:h-5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs md:text-base text-gray-500 dark:text-gray-400">{property.location_address}</span>
            </div>
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
            {[
              { icon: Building2, label: 'Config', value: property.bhkLabel },
              { icon: Maximize, label: 'Super Area', value: property.areaLabel },
              { icon: Tag, label: 'Purpose', value: property.listingTypeLabel || 'For Sale' },
              { icon: UserCheck, label: 'Ownership', value: property.ownershipLabel || '1st Owner' },
              { icon: Layers, label: 'Floor', value: property.floor || '—' },
              { icon: Calendar, label: 'Possession', value: property.possession || '—' },
            ].map((spec) => (
              <div key={spec.label} className="bg-gray-50 dark:bg-navy-800 rounded-xl p-2.5 md:p-3 text-center shadow-sm border border-gray-100/60 dark:border-gray-800/60">
                <spec.icon className="w-4 h-4 md:w-5 md:h-5 text-primary mx-auto mb-1 md:mb-1.5" />
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide font-medium">{spec.label}</p>
                <p className="text-xs md:text-sm font-semibold text-navy dark:text-white truncate">{spec.value}</p>
              </div>
            ))}
          </div>

          {/* Highlight Tags */}
          {property.highlights?.length > 0 && (
            <div className="flex flex-wrap gap-2 md:gap-3">
              {property.highlights.map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 md:gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 text-[10px] md:text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <hr className="border-gray-100/60 dark:border-gray-800/60" />

          {/* About */}
          {property.description && (
            <div>
              <h2 className="text-base md:text-2xl font-bold text-navy dark:text-white mb-2 md:mb-4">About the Project</h2>
              <p className={`text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line ${!showFullAbout ? 'line-clamp-3 md:line-clamp-none' : ''}`}>
                {property.description}
              </p>
              <button onClick={() => setShowFullAbout(!showFullAbout)} className="text-primary text-xs font-semibold mt-1 hover:text-teal-700 md:hidden">
                {showFullAbout ? 'Show less' : 'Read more'}
              </button>
            </div>
          )}

          {/* Top Highlights (Amenities) Grid */}
          {property.amenities?.length > 0 && (
            <>
              <hr className="border-gray-100/60 dark:border-gray-800/60 md:hidden" />
              <div>
                <h2 className="text-base md:text-xl font-bold text-navy dark:text-white mb-3 md:mb-4">Top Highlights</h2>
                <div className="grid grid-cols-3 gap-2.5 md:gap-4">
                  {property.amenities.map((amenityId: string) => {
                    const amenity = resolveAmenity(amenityId);
                    const Icon = amenity.icon;
                    return (
                      <div key={amenityId} className="bg-gray-50 dark:bg-navy-800 rounded-xl p-3 md:p-4 text-center border border-gray-100/60 dark:border-gray-800/60 shadow-sm hover:shadow-md transition-shadow">
                        <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-1.5 md:mb-2" />
                        <p className="text-[10px] md:text-xs font-semibold text-gray-700 dark:text-gray-300">{amenity.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <hr className="border-gray-100/60 dark:border-gray-800/60" />

          {/* Location Advantage */}
          {property.nearby?.length > 0 && (
            <div className="pb-8">
              <h2 className="text-base md:text-xl font-bold text-navy dark:text-white mb-3 md:mb-4">Location Advantage</h2>
              <div className="space-y-2 md:space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {property.nearby.map((place: any) => (
                  <div key={place.name} className="flex items-center justify-between bg-gray-50 dark:bg-navy-800 rounded-xl px-3 py-2.5 md:p-4 border border-gray-100/60 dark:border-gray-800/60 shadow-sm">
                    <div className="flex items-center gap-2 md:gap-3">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{place.name}</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-primary bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md">{place.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Year Price Appreciation Predictor */}
          <div className="pt-2 pb-6">
            <AppreciationPredictor property={property} />
          </div>

          {/* EMI Calculator */}
          <div className="pt-4 pb-8">
            <EMICalculator propertyPrice={Number(property.price) || 10000000} />
          </div>
        </div>

        {/* Right Column (Sticky Actions - Desktop) */}
        <div className="hidden md:block w-[340px] shrink-0 sticky top-20 bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-lg rounded-xl p-6 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-primary">{property.formattedPrice}</span>
            {property.priceLabel && <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{property.priceLabel}</span>}
          </div>
          <div className="space-y-2.5 mt-6">
            <button onClick={openEnquiry} className="w-full h-12 bg-primary hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 active:scale-[0.98]">
              <Phone className="w-4 h-4" /> Contact Agent
            </button>
            <a
              href={getWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Us
            </a>
            <button
              onClick={() => {
                try {
                  const stored = JSON.parse(localStorage.getItem('roofmint_compare_ids') || '[]');
                  const updated = Array.from(new Set([property.id, ...stored])).slice(0, 3);
                  localStorage.setItem('roofmint_compare_ids', JSON.stringify(updated));
                } catch {}
                window.location.href = '/compare';
              }}
              className="w-full h-10 border border-gray-200/60 dark:border-gray-800/60 hover:border-primary hover:text-primary text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Layers className="w-4 h-4" /> Compare Property
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar (Mobile Only) */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:hidden bg-white dark:bg-navy-900 border-t border-gray-100/60 dark:border-gray-800/60 px-4 py-3 z-40 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={openEnquiry} className="flex-1 h-11 bg-primary hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]">
          <Phone className="w-4 h-4" /> Enquire
        </button>
        <a
          href={getWaLink()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="flex-1 h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
      </div>

      <LoginPromptModal
        open={showLoginGate}
        onClose={() => setShowLoginGate(false)}
        title="Login to Enquire"
        message="So our agents can follow up with you directly, please login or create a free account before contacting them about this property."
      />

      {/* One-field phone capture — shown only when the profile has no usable
          phone yet (common for Google sign-ins), so a WhatsApp lead is
          never logged with an empty, unreachable number. */}
      {showWhatsAppPhoneModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-bold text-navy dark:text-white mb-1">One quick thing</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add your mobile number so our agent can reach you back, then we&apos;ll open WhatsApp.</p>
            {whatsappPhoneError && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900">
                {whatsappPhoneError}
              </div>
            )}
            <form onSubmit={handleWhatsAppPhoneSubmit} className="space-y-3">
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                maxLength={13}
                value={whatsappPhoneInput}
                onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                placeholder="10-digit Mobile Number *"
                className="w-full h-11 px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowWhatsAppPhoneModal(false)}
                  className="flex-1 h-12 border border-gray-200/60 dark:border-gray-800/60 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={whatsappSubmitting}
                  className="flex-1 h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
                  {whatsappSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {whatsappSubmitting ? 'Continuing...' : 'Continue to WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

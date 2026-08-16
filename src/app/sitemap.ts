import type { MetadataRoute } from 'next';
import { createClient } from '@/utils/supabase/server';

const siteUrl = 'https://roofmint.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from('properties')
    .select('slug, updated_at')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  const propertyEntries: MetadataRoute.Sitemap = (properties || []).map((p) => ({
    url: `${siteUrl}/properties/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/signup`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/profile/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  return [...staticEntries, ...propertyEntries];
}

import type { Metadata } from 'next';
import { getPropertyBySlug } from '../actions';
import { PropertyDetailClient } from './property-detail-client';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    return { title: 'Property Not Found | Roofmint' };
  }

  const locationBit = [property.locality, property.city].filter(Boolean).join(', ') || property.location_address;
  const configBit = [property.bhkLabel, property.property_type].filter(Boolean).join(' ');
  const title = `${configBit ? configBit + ' ' : ''}in ${locationBit || 'India'} — ${property.formattedPrice}${property.priceLabel ? ' ' + property.priceLabel : ''} | Roofmint`;
  const description = property.description
    ? property.description.slice(0, 155)
    : `${configBit || 'Property'} for ${property.listingTypeLabel || 'Sale'} in ${locationBit || 'India'} at ${property.formattedPrice} — verified listing on Roofmint.`;
  const image = property.images?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image, width: 1200, height: 800, alt: property.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PropertyDetailClient slug={slug} />;
}

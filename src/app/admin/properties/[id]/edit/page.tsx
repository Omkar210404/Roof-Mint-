import { notFound } from 'next/navigation';
import { getPropertyById } from '../../actions';
import { PropertyForm } from '../../property-form';

// Raises the ceiling for the generatePriceForecast Server Action invoked
// from this page (a Gemini call can legitimately take close to 20s) — a
// Server Action's duration ceiling comes from the route that calls it, not
// from actions.ts itself (which can't export non-function values at all).
export const maxDuration = 30;

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) notFound();

  return <PropertyForm mode="edit" propertyId={id} initialData={property} />;
}

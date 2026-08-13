import { notFound } from 'next/navigation';
import { getPropertyById } from '../../actions';
import { PropertyForm } from '../../property-form';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) notFound();

  return <PropertyForm mode="edit" propertyId={id} initialData={property} />;
}

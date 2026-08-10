import { MessageSquare, Clock, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import { getUserEnquiries } from '../properties/actions';

export default async function EnquiriesPage() {
  const enquiries = await getUserEnquiries();

  const statusColors: Record<string, string> = {
    new: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    contacted: 'text-amber-600 bg-amber-50',
    follow_up: 'text-purple-600 bg-purple-50',
    site_visit: 'text-indigo-600 bg-indigo-50',
    closed: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40',
    closed_won: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40',
    closed_lost: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40',
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-background min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-3 md:px-8 md:pt-6">
          <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white">My Enquiries</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{enquiries.length} enquiries made</p>
        </div>

        {enquiries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-navy dark:text-white mb-1">No enquiries yet</h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-xs md:max-w-sm mb-6">
              When you enquire about a property, your requests and callback updates will appear here.
            </p>
            <Link href="/" className="h-10 md:h-11 px-6 bg-primary text-white text-xs md:text-sm font-bold rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="px-4 space-y-3 md:px-8 pb-6">
            {enquiries.map((enquiry: any) => (
              <div key={enquiry.id} className="bg-white dark:bg-navy-900 rounded-xl p-4 shadow-sm border border-gray-100/60 dark:border-gray-800/60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-navy dark:text-white">
                          {enquiry.property?.title || 'General Enquiry'}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {enquiry.property?.locality ? `${enquiry.property.locality}, ${enquiry.property.city}` : 'No location'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize ${statusColors[enquiry.status] || 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-navy-800'}`}>
                        {enquiry.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {enquiry.message && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-1">{enquiry.message}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(enquiry.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

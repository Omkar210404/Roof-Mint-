'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitEnquiry } from '@/app/(client)/properties/actions'

export function EnquiryForm({ propertyId }: { propertyId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    try {
      formData.append('property_id', propertyId)
      await submitEnquiry(formData)
      setIsSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
        <h3 className="font-bold text-lg mb-2">Request Received!</h3>
        <p>Thanks! Our team will reach out within 24 hours.</p>
      </div>
    )
  }

  return (
    <form action={handleAction} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input id="name" name="name" required placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input id="phone" name="phone" required placeholder="+1 234 567 8900" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="budget_hint">Budget Hint</Label>
        <Input id="budget_hint" name="budget_hint" placeholder="E.g. $500k - $700k" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" placeholder="I'm interested in this property..." rows={3} />
      </div>
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Enquire Now'}
      </Button>
    </form>
  )
}

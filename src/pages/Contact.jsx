/**
 * Contact page for sales inquiries, Federal Entry Brief, and support.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'

function Contact() {
  const [searchParams] = useSearchParams()
  const subject = searchParams.get('subject')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const productNames = {
    'GovCon+Intelligence+Pricing': 'GovCon Intelligence',
    'Healthcare+AI+Pricing': 'Healthcare AI',
    'AI+Studio+Pricing': 'AI Studio',
    'Command+Center+Pricing': 'Command Centers',
    'GovCon Intelligence Pricing': 'GovCon Intelligence',
    'Healthcare AI Pricing': 'Healthcare AI',
    'AI Studio Pricing': 'AI Studio',
    'Command Center Pricing': 'Command Centers',
  }
  const productName = productNames[subject] || 'your product'
  const defaultMessage = useMemo(() => {
    return subject
      ? `I am interested in learning more about ${productName} and would like to discuss pricing and access.`
      : ''
  }, [subject, productName])
  const [message, setMessage] = useState(defaultMessage)
  const mailtoHref = useMemo(() => {
    const finalSubject = subject || 'Federal Entry Brief Inquiry'
    return `mailto:support@nm2tech-sas.com?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(message || '')}`
  }, [subject, message])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h1>
      <p className="text-gray-600 mb-8">
        For Federal Entry Intelligence Brief inquiries, consultations, or general support.
      </p>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Email us at{' '}
          <a href="mailto:support@nm2tech-sas.com" className="text-indigo-600 font-medium hover:underline">
            support@nm2tech-sas.com
          </a>
          {' '}with the subject &quot;Federal Entry Brief&quot; or &quot;Consultation&quot; and we’ll respond within 1–2 business days.
        </p>
        <p className="text-sm text-gray-600">
          Include your company name, target NAICS or agencies, and preferred consultation timeframe.
        </p>
        <div className="grid gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <a href={mailtoHref} className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700">
          Send Email
        </a>
      </div>
      <p className="mt-6 text-sm text-gray-500">
        <Link to="/federal-entry-brief" className="text-indigo-600 hover:underline">← Federal Entry Intelligence Brief</Link>
      </p>
    </div>
  )
}

export default Contact

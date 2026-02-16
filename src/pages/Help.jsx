import { useState } from 'react'
import { Link } from 'react-router-dom'

function Help() {
  const [openSection, setOpenSection] = useState(null)

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I upload my data?',
          a: 'Simply drag and drop your CSV or Excel file onto the upload area on the home page, or click "Browse Files" to select a file. Supported formats include .csv and .xlsx files up to 50MB (Pro plan) or 5MB (Free plan).'
        },
        {
          q: 'What file formats are supported?',
          a: 'We support CSV (.csv) and Excel (.xlsx, .xls) files. Your file should have headers in the first row and at least one numeric column for chart generation.'
        },
        {
          q: 'Do I need to create an account?',
          a: 'You can try the service without an account using public data APIs. However, to save dashboards, access advanced features, and manage subscriptions, you\'ll need to create a free account.'
        },
        {
          q: 'How do I get started with public data?',
          a: 'On the home page, scroll down to "Or Explore Public Data APIs" section. Click on any API dataset (USA Spending, Unemployment Rate, CDC Health Data, Government Budget, SAM.gov Opportunities) to instantly load a real-time dashboard and see how the platform works.'
        }
      ]
    },
    {
      category: 'Studio & Report Chat',
      questions: [
        {
          q: 'What is Studio?',
          a: 'Studio is an AI-powered report builder. Open it from the sidebar under "Studio" (or "Report Chat"). You work in one place with three tabs: Data, Report Chat, and Preview—no need to switch pages.'
        },
        {
          q: 'What are the three tabs (Data, Report Chat, Preview)?',
          a: 'Data: Choose a dataset (examples or your upload), upload a file, or view schema. Report Chat: Describe the report you want in plain language; the AI generates charts, KPIs, and filters. Preview: See your report live, adjust style with the style dock, and use Save / Share in the header.'
        },
        {
          q: 'How do I build a report with Report Chat?',
          a: 'Select or upload data in the Data tab first. Then open the Report Chat tab, type what you want (e.g. "Executive summary of this dataset" or "Top 5 categories by value"), and click Send. The report appears in the Preview tab; you can keep chatting to refine it.'
        },
        {
          q: 'Where do I save or share my report?',
          a: 'Use the header buttons: "Save" saves the report to your account. "Share" copies a link so others can view it (save first). "Public link" gives a shareable URL. These are available on every Studio tab (Data, Report Chat, Preview).'
        },
        {
          q: 'What is the Data tab for?',
          a: 'The Data tab lets you pick a dataset (example datasets or your uploaded file), upload a new file (CSV/Excel), and view the schema. Data Lake (save and reuse datasets) is coming soon.'
        },
        {
          q: 'What is the Preview tab?',
          a: 'The Preview tab shows your generated report—charts, KPIs, and filters. You can change theme and layout in the Style dock on the right. If nothing is there yet, use Report Chat to generate a report first.'
        }
      ]
    },
    {
      category: 'Features & Usage',
      questions: [
        {
          q: 'What types of charts can I create?',
          a: 'The platform automatically generates Bar charts, Line charts, Pie charts, and Forecast charts based on your data. You can switch between Simple and Advanced views to see different visualizations.'
        },
        {
          q: 'How do filters work?',
          a: 'Click the "Filters" button in the top right corner of the dashboard. You can filter by date range, category, or numeric range. Filters update all charts in real-time.'
        },
        {
          q: 'What are AI Insights?',
          a: 'AI Insights provide intelligent analysis of your data, explaining trends, patterns, and opportunities. Click "Generate Insights" in the AI Insights section to get AI-powered recommendations.'
        },
        {
          q: 'Can I export my data?',
          a: 'Yes! Pro and Enterprise plans can export dashboards as PDF, data as Excel, or filtered data as CSV. Look for the export buttons in the AI Insights & Export section.'
        },
        {
          q: 'How do I share a dashboard?',
          a: 'Click the "Share Dashboard" button on your dashboard. This creates a shareable link that anyone can view without logging in. You can copy the link and send it to others.'
        }
      ]
    },
    {
      category: 'Pricing & Plans',
      questions: [
        {
          q: 'What\'s the difference between Free and Pro plans?',
          a: 'Free plan includes 3 dashboards, 5 uploads/month, 5MB file size, and basic charts. Pro plan ($29/month) includes unlimited dashboards, unlimited uploads, 50MB file size, forecasting, AI insights, and export features.'
        },
        {
          q: 'Can I change plans later?',
          a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.'
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards through Stripe. Your payment information is securely processed and never stored on our servers.'
        },
        {
          q: 'Is there a free trial?',
          a: 'The Free plan is available forever with no credit card required. You can try all features with example data before upgrading.'
        },
        {
          q: 'Can I cancel my subscription?',
          a: 'Yes, you can cancel your subscription at any time. Your account will remain active until the end of the current billing period. No refunds are provided for partial billing periods.'
        }
      ]
    },
    {
      category: 'Technical Issues',
      questions: [
        {
          q: 'My file upload failed. What should I do?',
          a: 'Check that your file is under the size limit (5MB for Free, 50MB for Pro). Ensure it\'s a valid CSV or Excel file with headers. Try refreshing the page and uploading again.'
        },
        {
          q: 'Charts are not displaying correctly.',
          a: 'Make sure your data has at least one numeric column. Check that date columns are in a recognizable format (YYYY-MM-DD). Try switching between Simple and Advanced views.'
        },
        {
          q: 'I\'m getting an error message.',
          a: 'Check your internet connection and try refreshing the page. If the error persists, ensure your file format is correct. Contact support if the issue continues.'
        },
        {
          q: 'How do I delete my account?',
          a: 'Contact support at support@nm2tech.com to request account deletion. We\'ll process your request within 7 business days.'
        }
      ]
    },
    {
      category: 'Data & Privacy',
      questions: [
        {
          q: 'Is my data secure?',
          a: 'Yes! We use encryption for data in transit and at rest. Your data is only accessible to you and is never shared with third parties. See our Privacy Policy for more details.'
        },
        {
          q: 'Who can see my data?',
          a: 'Only you can see your data. If you share a dashboard link, viewers can only see the shared dashboard, not your account or other dashboards.'
        },
        {
          q: 'Can I delete my data?',
          a: 'Yes, you can delete individual dashboards or contact us to delete all your data. Deleted data cannot be recovered.'
        },
        {
          q: 'Do you store my payment information?',
          a: 'No, all payments are processed securely through Stripe. We never store your credit card information on our servers.'
        }
      ]
    }
  ]

  const toggleSection = (index) => {
    setOpenSection(openSection === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions and learn how to use NM2TECH Analytics Shorts
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link
            to="/"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Get Started</h3>
            <p className="text-sm text-gray-600">Upload your first file</p>
          </Link>

          <Link
            to="/studio/chat"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Studio / Report Chat</h3>
            <p className="text-sm text-gray-600">Build reports with AI</p>
          </Link>

          <Link
            to="/pricing"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">View Pricing</h3>
            <p className="text-sm text-gray-600">See our plans</p>
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Contact Support</h3>
            <p className="text-sm text-gray-600">support@nm2tech.com</p>
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {faqs.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection(sectionIndex)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">{section.category}</h2>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openSection === sectionIndex ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openSection === sectionIndex && (
                <div className="px-6 pb-6 space-y-4">
                  {section.questions.map((faq, faqIndex) => (
                    <div key={faqIndex} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                      <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                      <p className="text-gray-700">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-gray-700 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <a
            href="mailto:support@nm2tech.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}

export default Help


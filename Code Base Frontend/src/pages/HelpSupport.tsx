import { HelpCircle, Mail, Phone, FileText, MessageSquare, ExternalLink } from 'lucide-react'

export default function HelpSupport() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Help & Support</h1>
        <p className="text-sm text-muted-foreground">Get assistance with the ER Command Center</p>
      </div>

      {/* Quick Help */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-4">
          {[
            { q: 'How do I register a new patient?', a: 'Click the "New Arrival" button on the Dashboard. Fill in patient details, vitals, and complaint. The system will auto-assign a bed and run AI triage.' },
            { q: 'How do I discharge a patient?', a: 'Go to Patients page, click on the patient, then click "Discharge". Only doctors and admins can discharge patients.' },
            { q: 'How does AI triage work?', a: 'When a patient is registered, the AI analyzes their vitals, complaint, and history to assign a priority level (Immediate, Urgent, Less Urgent, Non-Urgent).' },
            { q: 'How do I change my password?', a: 'Go to Settings > Security > Change Password. Enter your current password and new password.' },
            { q: 'What do the alert priorities mean?', a: 'Critical (red) = immediate action needed. High (orange) = urgent attention. Medium (yellow) = monitor closely. Low (blue) = informational.' },
          ].map(({ q, a }, i) => (
            <details key={i} className="group border rounded-lg">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg">
                {q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">&#9660;</span>
              </summary>
              <p className="px-4 pb-3 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Contact Support</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Email Support</p>
              <p className="text-sm text-muted-foreground">support@ercommandcenter.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Phone Support</p>
              <p className="text-sm text-muted-foreground">Available 24/7 for critical issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">System Information</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Version</p>
            <p className="font-medium text-foreground">1.0.0</p>
          </div>
          <div>
            <p className="text-muted-foreground">Environment</p>
            <p className="font-medium text-foreground">{import.meta.env.VITE_ENV || 'production'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useRef, type ReactNode } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { X, Plus, MessageSquare, FileText, Pill, LogOut as DischargeIcon, Pencil, Brain, AlertTriangle, CheckCircle2, Clock, ChevronRight, ChevronDown, ChevronUp, Printer, UserX, Loader2, Activity, BarChart2, FlaskConical, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useDischargePatient, usePatientNotes, useCreateNote, usePatientVitals, useAddVitals, usePatientPrescriptions } from '@/hooks/usePatientDetails';
import { PrescribeModal } from './PrescribeModal';
import { DischargeModal } from './DischargeModal';
import { EditPatientModal } from './EditPatientModal';

interface NurseNote {
  id: string;
  category: 'Assessment' | 'Intervention' | 'Observation' | 'Communication';
  note: string;
  performer: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
}

interface DoctorComment {
  id: string;
  type: 'Diagnosis' | 'Treatment' | 'Prescription' | 'Referral' | 'General';
  comment: string;
  doctor: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
}

interface Patient {
  id: string;
  avatar?: string;
  initials: string;
  name: string;
  age: string;
  gender?: string;
  purpose: string;
  statusColor: string;
  status: string;
  uhi: string;
  euhi?: string;
  tags?: string[];
  doctor: string;
  bed: string;
  bedId?: string;
  bloodGroup: string;
  phone: string;
  photo?: string | null;
  priority?: number | null;
  priorityLabel?: string | null;
  triage?: {
    reasoning: string;
    recommendations: string[];
    confidence: number;
    estimatedWaitTime: string;
  } | null;
  vitals?: {
    hr: number;
    bp: string;
    spo2: number;
    temp: number;
  } | null;
  admittedAt?: string | null;
}

interface OPDPatientModalProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRecordedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No timestamp';
  let normalized = dateStr;
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    normalized = dateStr.replace(' ', 'T');
  }
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return 'No timestamp';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago · ${d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function OPDPatientModal({ patient, open, onOpenChange }: OPDPatientModalProps) {
  const { user, canAddNurseNotes, canAddDoctorComments, canDischarge, canPrescribe, canRegisterPatients } = useUser();

  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'doctor' | 'mar' | 'lab' | 'consult'>('vitals');

  // Fetch data from API
  const { data: nurseNotesData, isLoading: nurseNotesLoading } = usePatientNotes(patient?.id || null, 'nurse');
  const { data: doctorNotesData, isLoading: doctorNotesLoading } = usePatientNotes(patient?.id || null, 'doctor');
  const { data: labOrdersData, isLoading: labOrdersLoading } = usePatientNotes(patient?.id || null, 'lab_order');
  const { data: consultationsData, isLoading: consultationsLoading } = usePatientNotes(patient?.id || null, 'consultation');
  const { data: vitalsHistory, isLoading: vitalsLoading } = usePatientVitals(patient?.id || null);
  const { data: prescriptionsData, isLoading: prescriptionsLoading } = usePatientPrescriptions(patient?.id || null);
  const createNoteMutation = useCreateNote();
  const addVitalsMutation = useAddVitals();

  // Nurse Notes state
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({
    category: 'Assessment' as NurseNote['category'],
    note: ''
  });

  // Doctor Comments state
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState({
    type: 'General' as DoctorComment['type'],
    comment: ''
  });

  // Vitals state
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [newVitals, setNewVitals] = useState({
    hr: '',
    bp: '',
    spo2: '',
    temp: '',
    rr: '',
    source: 'manual' as 'manual' | 'ocr'
  });
  const [showVitalsChart, setShowVitalsChart] = useState(false);

  // Triage toggle
  const [showTriageDetails, setShowTriageDetails] = useState(false);

  // Lab Orders state
  const [showAddLabOrder, setShowAddLabOrder] = useState(false);
  const [newLabOrder, setNewLabOrder] = useState('');

  // Consultations state
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [newConsultation, setNewConsultation] = useState({ specialty: '', reason: '' });

  // Action modals state
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showDischargeSummary, setShowDischargeSummary] = useState(false);
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  const [dischargeTreatment, setDischargeTreatment] = useState('');
  const [dischargeFollowUp, setDischargeFollowUp] = useState('');
  const [dischargeError, setDischargeError] = useState('');
  const summaryRef = useRef<HTMLDivElement>(null);

  const dischargePatient = useDischargePatient();

  if (!open || !patient) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Assessment':
        return 'bg-red-100 text-red-700';
      case 'Intervention':
        return 'bg-orange-100 text-orange-700';
      case 'Observation':
        return 'bg-blue-100 text-blue-700';
      case 'Communication':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'Diagnosis':
        return 'bg-red-100 text-red-700';
      case 'Treatment':
        return 'bg-green-100 text-green-700';
      case 'Prescription':
        return 'bg-blue-100 text-blue-700';
      case 'Referral':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityBgColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-50 border-red-200';
      case 2: return 'bg-orange-50 border-orange-200';
      case 3: return 'bg-yellow-50 border-yellow-200';
      case 4: return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  const getPriorityTextColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-700';
      case 2: return 'text-orange-700';
      case 3: return 'text-yellow-700';
      case 4: return 'text-green-700';
      default: return 'text-gray-700';
    }
  };

  // Vitals chart data (oldest → newest)
  const vitalsChartData = (vitalsHistory || [])
    .slice()
    .reverse()
    .map((record: any) => {
      const raw = record.recordedAt;
      const normalized = raw?.includes(' ') && !raw?.includes('T') ? raw.replace(' ', 'T') : raw;
      const d = new Date(normalized);
      return {
        time: !isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
        HR: record.hr || null,
        SpO2: record.spo2 || null,
      };
    });

  // Add Vitals handler
  const handleAddVitals = async () => {
    if (!newVitals.hr && !newVitals.bp && !newVitals.spo2) return;
    try {
      await addVitalsMutation.mutateAsync({
        patientId: patient.id,
        vitals: newVitals
      });
      setNewVitals({ hr: '', bp: '', spo2: '', temp: '', rr: '', source: 'manual' });
      setShowAddVitals(false);
    } catch (error) {
      console.error('Failed to add vitals:', error);
    }
  };

  // Remove patient handler
  const handleRemovePatient = async () => {
    setDischargeError('');
    try {
      let notes = `Diagnosis: ${dischargeDiagnosis}\nTreatment: ${dischargeTreatment}`;
      if (dischargeFollowUp) {
        notes += `\nFollow-up: ${dischargeFollowUp}`;
      }
      await dischargePatient.mutateAsync({
        patientId: patient.id,
        data: {
          discharge_notes: notes,
        }
      });
      setShowDischargeSummary(true);
      setShowRemoveConfirm(false);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || 'Failed to discharge patient';
      setDischargeError(msg);
    }
  };

  const handlePrintSummary = () => {
    if (!summaryRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Discharge Summary - ${patient.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
        h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 16px; margin-top: 20px; color: #444; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header-right { text-align: right; font-size: 12px; color: #666; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
        .field { font-size: 13px; }
        .field-label { font-weight: bold; color: #555; font-size: 11px; text-transform: uppercase; }
        .field-value { margin-top: 2px; }
        .section { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin: 12px 0; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 13px; }
        .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 16px; font-size: 11px; color: #888; display: flex; justify-content: space-between; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${summaryRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Nurse Notes handlers
  const handleAddNote = async () => {
    if (!newNote.note.trim() || !patient) return;
    try {
      await createNoteMutation.mutateAsync({
        patientId: patient.id,
        data: {
          type: 'nurse',
          content: `[${newNote.category}] ${newNote.note}`,
        }
      });
      setNewNote({ category: 'Assessment', note: '' });
      setShowAddNote(false);
    } catch (error) {
      console.error('Failed to save nurse note:', error);
    }
  };

  // Doctor Comments handlers
  const handleAddComment = async () => {
    if (!newComment.comment.trim() || !patient) return;
    try {
      await createNoteMutation.mutateAsync({
        patientId: patient.id,
        data: {
          type: 'doctor',
          content: `[${newComment.type}] ${newComment.comment}`,
        }
      });
      setNewComment({ type: 'General', comment: '' });
      setShowAddComment(false);
    } catch (error) {
      console.error('Failed to save doctor comment:', error);
    }
  };

  // Lab Orders handler
  const handleAddLabOrder = async () => {
    if (!newLabOrder.trim() || !patient) return;
    try {
      await createNoteMutation.mutateAsync({
        patientId: patient.id,
        data: { type: 'lab_order', content: newLabOrder }
      });
      setNewLabOrder('');
      setShowAddLabOrder(false);
    } catch (error) {
      console.error('Failed to save lab order:', error);
    }
  };

  // Consultations handler
  const handleAddConsultation = async () => {
    if (!newConsultation.reason.trim() || !patient) return;
    try {
      await createNoteMutation.mutateAsync({
        patientId: patient.id,
        data: {
          type: 'consultation',
          content: newConsultation.specialty
            ? `[${newConsultation.specialty}] ${newConsultation.reason}`
            : newConsultation.reason
        }
      });
      setNewConsultation({ specialty: '', reason: '' });
      setShowAddConsultation(false);
    } catch (error) {
      console.error('Failed to save consultation:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            {(patient.photo || patient.avatar) ? (
              <img src={patient.photo || patient.avatar} alt={patient.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-foreground">
                {patient.initials}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{patient.name}</h2>
              <p className="text-sm text-muted-foreground">
                {patient.age} • {patient.purpose}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${patient.statusColor}`}>
              {patient.status}
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Compact patient info bar */}
        <div className="px-6 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="text-muted-foreground">UHI:</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{patient.uhi}</span>
          </span>
          {patient.tags?.includes('ER Referral') && patient.euhi && (
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">EUHI:</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">{patient.euhi}</span>
            </span>
          )}
          <span className="text-muted-foreground">Blood: <span className="font-medium text-red-600">{patient.bloodGroup}</span></span>
          <span className="text-muted-foreground">Contact: <span className="font-medium text-foreground">{patient.phone}</span></span>
          <span className="ml-auto text-muted-foreground">Dr. <span className="font-medium text-foreground">{patient.doctor}</span></span>
          <span className="text-muted-foreground">Bed: <span className="font-medium text-foreground">{patient.bed}</span></span>
          {patient.tags && patient.tags.length > 0 && patient.tags.map((tag: string) => (
            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 border border-orange-300">
              {tag}
            </span>
          ))}
        </div>

        {/* AI Triage Assessment (collapsible, like ER modal) */}
        {patient.triage && patient.priority && (
          <div className={`mx-6 mt-2 rounded-lg border overflow-hidden ${getPriorityBgColor(patient.priority)}`}>
            <button
              onClick={() => setShowTriageDetails(!showTriageDetails)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-foreground">AI Triage Assessment</span>
                <span className={`ml-1 font-semibold text-sm ${getPriorityTextColor(patient.priority)}`}>
                  {patient.priority <= 2 ? <AlertTriangle className="w-4 h-4 inline mr-1" /> : <CheckCircle2 className="w-4 h-4 inline mr-1" />}
                  {patient.priorityLabel || `Level ${patient.priority}`}
                </span>
                {patient.triage.confidence > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(patient.triage.confidence * 100)}%)
                  </span>
                )}
                {patient.triage.estimatedWaitTime && (
                  <span className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {patient.triage.estimatedWaitTime}
                  </span>
                )}
              </div>
              {showTriageDetails ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showTriageDetails && (
              <div className="px-3 pb-3 border-t border-black/10">
                {patient.triage.reasoning && (
                  <p className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2 mt-2 mb-2">
                    {patient.triage.reasoning}
                  </p>
                )}
                {patient.triage.recommendations && patient.triage.recommendations.length > 0 && (
                  <ul className="space-y-0.5">
                    {patient.triage.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b bg-muted/30 mt-2">
          {([
            { id: 'vitals', icon: <Activity className="w-3.5 h-3.5" />, label: 'Vitals' },
            { id: 'notes', icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Nurse Notes' },
            { id: 'doctor', icon: <FileText className="w-3.5 h-3.5" />, label: 'Doctor Notes' },
            { id: 'mar', icon: <Pill className="w-3.5 h-3.5" />, label: 'MAR' },
            { id: 'lab', icon: <FlaskConical className="w-3.5 h-3.5" />, label: 'Lab Orders' },
            { id: 'consult', icon: <Users className="w-3.5 h-3.5" />, label: 'Consults' },
          ] as { id: typeof activeTab; icon: ReactNode; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Vitals Tab */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              {/* Toolbar: Record Vitals + Chart Toggle */}
              {!showAddVitals && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddVitals(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Record Vitals
                  </button>
                  {vitalsChartData.length > 1 && (
                    <button
                      onClick={() => setShowVitalsChart((v) => !v)}
                      className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" />
                      {showVitalsChart ? 'Hide Chart' : 'Trend Chart'}
                    </button>
                  )}
                </div>
              )}

              {/* Vitals Trend Chart */}
              {showVitalsChart && vitalsChartData.length > 1 && (
                <div className="bg-muted/30 border rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">HR &amp; SpO2 Trend</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={vitalsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[60, 110]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="HR" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="HR (bpm)" connectNulls />
                      <Line type="monotone" dataKey="SpO2" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="SpO2 (%)" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Add Vitals Form */}
              {showAddVitals && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Record New Vitals</h4>
                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">HR (bpm)</label>
                      <input
                        type="number"
                        value={newVitals.hr}
                        onChange={(e) => setNewVitals({ ...newVitals, hr: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-sm"
                        placeholder="72"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">BP (mmHg)</label>
                      <input
                        type="text"
                        value={newVitals.bp}
                        onChange={(e) => setNewVitals({ ...newVitals, bp: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-sm"
                        placeholder="120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={newVitals.spo2}
                        onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-sm"
                        placeholder="98"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newVitals.temp}
                        onChange={(e) => setNewVitals({ ...newVitals, temp: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-sm"
                        placeholder="36.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">RR (/min)</label>
                      <input
                        type="number"
                        value={newVitals.rr}
                        onChange={(e) => setNewVitals({ ...newVitals, rr: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-sm"
                        placeholder="16"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setShowAddVitals(false); setNewVitals({ hr: '', bp: '', spo2: '', temp: '', rr: '', source: 'manual' }); }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddVitals}
                      disabled={addVitalsMutation.isPending}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                    >
                      {addVitalsMutation.isPending ? 'Saving...' : 'Save Vitals'}
                    </button>
                  </div>
                </div>
              )}

              {/* Vitals History */}
              {vitalsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading vitals...</div>
              ) : vitalsHistory && vitalsHistory.length > 0 ? (
                vitalsHistory.map((record: any) => (
                  <div key={record.id} className="bg-muted/30 border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {record.recordedBy?.name?.charAt(0) || 'S'}
                        </div>
                        <span className="text-sm font-medium">{record.recordedBy?.name || 'System'}</span>
                        {record.recordedBy?.role && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            record.recordedBy.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                            record.recordedBy.role === 'nurse' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {record.recordedBy.role === 'doctor' ? 'Dr.' : record.recordedBy.role === 'nurse' ? 'Nurse' : record.recordedBy.role}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatRecordedDate(record.recordedAt)}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">HR</div>
                        <div className="text-2xl font-semibold">{record.hr || '-'}</div>
                        <div className="text-xs text-muted-foreground">bpm</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">BP</div>
                        <div className="text-2xl font-semibold">{record.bp || '-'}</div>
                        <div className="text-xs text-muted-foreground">mmHg</div>
                      </div>
                      <div className={`text-center ${record.spo2 && record.spo2 < 95 ? 'bg-red-50 rounded-lg' : ''}`}>
                        <div className="text-xs text-muted-foreground mb-1">SpO2</div>
                        <div className={`text-2xl font-semibold ${record.spo2 && record.spo2 < 95 ? 'text-red-600' : ''}`}>
                          {record.spo2 ? `${record.spo2}%` : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">TEMP</div>
                        <div className="text-2xl font-semibold">{record.temp || '-'}</div>
                        <div className="text-xs text-muted-foreground">°C</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">RR</div>
                        <div className="text-2xl font-semibold">{record.rr || '-'}</div>
                        <div className="text-xs text-muted-foreground">/min</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No vitals recorded yet.</p>
              )}
            </div>
          )}

          {/* Nurse Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {canAddNurseNotes && !showAddNote && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Nurse Note
                </button>
              )}

              {!canAddNurseNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  You are viewing as a {user?.role}. Only nurses can add or edit notes.
                </div>
              )}

              {showAddNote && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Add New Nurse Note</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-green-700 mb-1">Category</label>
                      <select
                        value={newNote.category}
                        onChange={(e) => setNewNote({ ...newNote, category: e.target.value as NurseNote['category'] })}
                        className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="Assessment">Assessment</option>
                        <option value="Intervention">Intervention</option>
                        <option value="Observation">Observation</option>
                        <option value="Communication">Communication</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-green-700 mb-1">Note</label>
                      <textarea
                        value={newNote.note}
                        onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                        placeholder="Enter nurse note..."
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowAddNote(false);
                          setNewNote({ category: 'Assessment', note: '' });
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.note.trim() || createNoteMutation.isPending}
                        className="px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {nurseNotesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading nurse notes...</div>
              ) : nurseNotesData && nurseNotesData.length > 0 ? (
                nurseNotesData.map((note: any) => {
                  const categoryMatch = note.content.match(/^\[(\w+)\]\s*/);
                  const category = categoryMatch ? categoryMatch[1] : 'General';
                  const noteText = categoryMatch ? note.content.slice(categoryMatch[0].length) : note.content;

                  return (
                    <div key={note.id} className="bg-muted/30 border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-700">
                            {note.createdBy?.name?.charAt(0) || 'N'}
                          </div>
                          <span className="text-sm font-medium">{note.createdBy?.name || 'Unknown'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(category)}`}>
                            {category}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRecordedDate(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{noteText}</p>
                    </div>
                  );
                })
              ) : !showAddNote ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No nurse notes yet.{canAddNurseNotes && ' Click "Add Nurse Note" to create one.'}
                </p>
              ) : null}
            </div>
          )}

          {/* Doctor Comments Tab */}
          {activeTab === 'doctor' && (
            <div className="space-y-3">
              {canAddDoctorComments && !showAddComment && (
                <button
                  onClick={() => setShowAddComment(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Doctor Comment
                </button>
              )}

              {!canAddDoctorComments && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  You are viewing doctor comments as a {user?.role}. Only doctors can add or edit comments.
                </div>
              )}

              {showAddComment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3">Add New Doctor Comment</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Type</label>
                      <select
                        value={newComment.type}
                        onChange={(e) => setNewComment({ ...newComment, type: e.target.value as DoctorComment['type'] })}
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="General">General</option>
                        <option value="Diagnosis">Diagnosis</option>
                        <option value="Treatment">Treatment</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Referral">Referral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Comment</label>
                      <textarea
                        value={newComment.comment}
                        onChange={(e) => setNewComment({ ...newComment, comment: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        placeholder="Enter doctor comment..."
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowAddComment(false);
                          setNewComment({ type: 'General', comment: '' });
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.comment.trim() || createNoteMutation.isPending}
                        className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createNoteMutation.isPending ? 'Saving...' : 'Save Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {doctorNotesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading doctor comments...</div>
              ) : doctorNotesData && doctorNotesData.length > 0 ? (
                doctorNotesData.map((comment: any) => {
                  const typeMatch = comment.content.match(/^\[(\w+)\]\s*/);
                  const commentType = typeMatch ? typeMatch[1] : 'General';
                  const commentText = typeMatch ? comment.content.slice(typeMatch[0].length) : comment.content;

                  return (
                    <div key={comment.id} className="bg-muted/30 border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                            {comment.createdBy?.name?.charAt(0) || 'D'}
                          </div>
                          <span className="text-sm font-medium">{comment.createdBy?.name || 'Unknown'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getCommentTypeColor(commentType)}`}>
                            {commentType}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRecordedDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{commentText}</p>
                    </div>
                  );
                })
              ) : !showAddComment ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No doctor comments yet.{canAddDoctorComments && ' Click "Add Doctor Comment" to create one.'}
                </p>
              ) : null}
            </div>
          )}

          {/* MAR — Medication Administration Record */}
          {activeTab === 'mar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Active and recent prescriptions for this patient</p>
                {canPrescribe && (
                  <button
                    onClick={() => setShowPrescribeModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    New Prescription
                  </button>
                )}
              </div>

              {prescriptionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading prescriptions...</div>
              ) : prescriptionsData && prescriptionsData.length > 0 ? (
                <div className="space-y-3">
                  {(prescriptionsData as any[]).map((rx) => (
                    <div key={rx.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{rx.medication || rx.medicationName || '—'}</p>
                          {rx.genericName && rx.genericName !== rx.medication && (
                            <p className="text-xs text-muted-foreground">{rx.genericName}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          rx.status === 'active' ? 'bg-green-100 text-green-700' :
                          rx.status === 'stopped' || rx.status === 'discontinued' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rx.status || 'active'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                        <span><span className="font-medium text-foreground">Dose:</span> {rx.dosage || '—'}</span>
                        <span><span className="font-medium text-foreground">Freq:</span> {rx.frequency || '—'}</span>
                        <span><span className="font-medium text-foreground">Route:</span> {rx.route || '—'}</span>
                        {rx.duration && <span><span className="font-medium text-foreground">Duration:</span> {rx.duration}</span>}
                        {rx.startDate && <span><span className="font-medium text-foreground">Start:</span> {new Date(rx.startDate).toLocaleDateString('en-IN')}</span>}
                        {rx.endDate && <span><span className="font-medium text-foreground">End:</span> {new Date(rx.endDate).toLocaleDateString('en-IN')}</span>}
                      </div>
                      {rx.instructions && (
                        <p className="text-xs text-muted-foreground mb-2"><span className="font-medium text-foreground">Instructions:</span> {rx.instructions}</p>
                      )}
                      {rx.drugInteractions && rx.drugInteractions.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          <span className="font-medium">Drug Interactions: </span>
                          {Array.isArray(rx.drugInteractions)
                            ? rx.drugInteractions.map((d: any) => typeof d === 'string' ? d : d.description || JSON.stringify(d)).join('; ')
                            : rx.drugInteractions}
                        </div>
                      )}
                      {rx.prescribedBy && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Prescribed by <span className="font-medium text-foreground">{rx.prescribedBy}</span>
                          {rx.prescribedAt && ` · ${formatRecordedDate(rx.prescribedAt)}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No prescriptions yet.</p>
              )}
            </div>
          )}

          {/* Lab Orders Tab */}
          {activeTab === 'lab' && (
            <div className="space-y-3">
              {canAddNurseNotes && !showAddLabOrder && (
                <button
                  onClick={() => setShowAddLabOrder(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Order Lab Test
                </button>
              )}
              {showAddLabOrder && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-teal-900">New Lab Order</h4>
                  <textarea
                    value={newLabOrder}
                    onChange={(e) => setNewLabOrder(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., CBC, LFT, RFT, Blood culture — include urgency and clinical indication"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setShowAddLabOrder(false); setNewLabOrder(''); }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddLabOrder}
                      disabled={!newLabOrder.trim() || createNoteMutation.isPending}
                      className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50"
                    >
                      {createNoteMutation.isPending ? 'Saving...' : 'Save Order'}
                    </button>
                  </div>
                </div>
              )}

              {labOrdersLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading lab orders...</div>
              ) : labOrdersData && labOrdersData.length > 0 ? (
                labOrdersData.map((order: any) => (
                  <div key={order.id} className="bg-muted/30 border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-medium">{order.createdBy?.name || 'Staff'}</span>
                        {order.createdBy?.role && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">{order.createdBy.role}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatRecordedDate(order.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground">{order.content}</p>
                  </div>
                ))
              ) : !showAddLabOrder ? (
                <p className="text-sm text-muted-foreground text-center py-4">No lab orders yet.</p>
              ) : null}
            </div>
          )}

          {/* Consultations Tab */}
          {activeTab === 'consult' && (
            <div className="space-y-3">
              {canAddDoctorComments && !showAddConsultation && (
                <button
                  onClick={() => setShowAddConsultation(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Request Consultation
                </button>
              )}
              {showAddConsultation && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-indigo-900">New Consultation Request</h4>
                  <div>
                    <label className="block text-xs text-indigo-700 mb-1">Specialty</label>
                    <input
                      type="text"
                      value={newConsultation.specialty}
                      onChange={(e) => setNewConsultation({ ...newConsultation, specialty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Cardiology, Neurology, Orthopaedics"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-indigo-700 mb-1">Reason / Clinical Question</label>
                    <textarea
                      value={newConsultation.reason}
                      onChange={(e) => setNewConsultation({ ...newConsultation, reason: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Describe the clinical question or reason for consultation..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setShowAddConsultation(false); setNewConsultation({ specialty: '', reason: '' }); }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddConsultation}
                      disabled={!newConsultation.reason.trim() || createNoteMutation.isPending}
                      className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                    >
                      {createNoteMutation.isPending ? 'Saving...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              )}

              {consultationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading consultations...</div>
              ) : consultationsData && consultationsData.length > 0 ? (
                consultationsData.map((consult: any) => {
                  const specialtyMatch = consult.content.match(/^\[([^\]]+)\]\s*/);
                  const specialty = specialtyMatch ? specialtyMatch[1] : null;
                  const reason = specialtyMatch ? consult.content.slice(specialtyMatch[0].length) : consult.content;
                  return (
                    <div key={consult.id} className="bg-muted/30 border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium">{consult.createdBy?.name || 'Doctor'}</span>
                          {specialty && (
                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{specialty}</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatRecordedDate(consult.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground">{reason}</p>
                    </div>
                  );
                })
              ) : !showAddConsultation ? (
                <p className="text-sm text-muted-foreground text-center py-4">No consultation requests yet.</p>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer with role-specific actions */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {canPrescribe && (
              <button
                onClick={() => setShowPrescribeModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                <Pill className="w-4 h-4" />
                Prescribe
              </button>
            )}
            {canDischarge && (
              <button
                onClick={() => setShowDischargeModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
              >
                <DischargeIcon className="w-4 h-4" />
                Complete Visit
              </button>
            )}
            {canRegisterPatients && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                <Pencil className="w-4 h-4" />
                Edit Patient
              </button>
            )}
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              <UserX className="w-4 h-4" />
              Remove Patient
            </button>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Prescribe Modal */}
      <PrescribeModal
        patientName={patient.name}
        patientId={patient.uhi}
        open={showPrescribeModal}
        onOpenChange={setShowPrescribeModal}
      />

      {/* Discharge Modal */}
      <DischargeModal
        patientName={patient.name}
        patientId={patient.id}
        department="OPD"
        open={showDischargeModal}
        onOpenChange={setShowDischargeModal}
        onDischarged={() => onOpenChange(false)}
        patientAge={patient.age}
        patientGender={patient.gender}
        patientUhi={patient.uhi}
        patientComplaint={patient.purpose}
        patientDoctor={patient.doctor}
        patientPhone={patient.phone}
        patientBloodGroup={patient.bloodGroup}
        patientTriageLabel={patient.priorityLabel || undefined}
        patientTriageReasoning={patient.triage?.reasoning}
        patientTriageRecommendations={patient.triage?.recommendations}
        patientVitals={patient.vitals || undefined}
      />

      {/* Edit Patient Modal */}
      <EditPatientModal
        patient={{
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender || '',
          complaint: patient.purpose,
          assignedDoctor: patient.doctor,
          bed: patient.bed,
          bedId: patient.bedId,
          uhi: patient.uhi,
          phone: patient.phone,
          bloodGroup: patient.bloodGroup,
        }}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />

      {/* Remove Patient Confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Remove Patient</h3>
                  <p className="text-sm text-muted-foreground">{patient.name} &middot; {patient.uhi}</p>
                </div>
              </div>
              <button onClick={() => setShowRemoveConfirm(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  This will discharge the patient and generate a discharge summary. The bed will be released.
                </p>
              </div>

              {dischargeError && (
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-3">
                  <p className="text-sm text-orange-800 font-medium">Error: {dischargeError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Final Diagnosis <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={dischargeDiagnosis}
                  onChange={(e) => setDischargeDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Enter primary diagnosis"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Treatment Summary <span className="text-red-500">*</span></label>
                <textarea
                  value={dischargeTreatment}
                  onChange={(e) => setDischargeTreatment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  placeholder="Summary of treatment provided..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Follow-up Instructions</label>
                <textarea
                  value={dischargeFollowUp}
                  onChange={(e) => setDischargeFollowUp(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  placeholder="Follow-up date and instructions..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePatient}
                disabled={!dischargeDiagnosis || !dischargeTreatment || dischargePatient.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dischargePatient.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {dischargePatient.isPending ? 'Removing...' : 'Remove & Generate Summary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Summary (Printable) */}
      {showDischargeSummary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
                  <p className="text-sm text-gray-500">Patient removed successfully</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSummary}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowDischargeSummary(false);
                    setDischargeDiagnosis('');
                    setDischargeTreatment('');
                    setDischargeFollowUp('');
                    onOpenChange(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Summary Content */}
            <div className="flex-1 overflow-y-auto p-6" ref={summaryRef}>
              <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, borderBottom: '2px solid #333', paddingBottom: 8, margin: 0 }}>
                  Discharge Summary
                </h1>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#666' }}>
                  <p style={{ margin: 0 }}>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p style={{ margin: 0 }}>Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <h2 style={{ fontSize: 16, marginTop: 16, color: '#444' }}>Patient Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Name</p>
                  <p style={{ marginTop: 2 }}>{patient.name}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Patient ID</p>
                  <p style={{ marginTop: 2 }}>{patient.uhi}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Age / Gender</p>
                  <p style={{ marginTop: 2 }}>{patient.age}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Blood Group</p>
                  <p style={{ marginTop: 2 }}>{patient.bloodGroup || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Doctor</p>
                  <p style={{ marginTop: 2 }}>{patient.doctor}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Contact</p>
                  <p style={{ marginTop: 2 }}>{patient.phone || 'N/A'}</p>
                </div>
              </div>

              <h2 style={{ fontSize: 16, marginTop: 20, color: '#444' }}>Visit Details</h2>
              <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, margin: '12px 0' }}>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Chief Complaint</p>
                  <p style={{ marginTop: 2 }}>{patient.purpose}</p>
                </div>
                {patient.priorityLabel && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Triage Level</p>
                    <p style={{ marginTop: 4 }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 12, fontWeight: 'bold', fontSize: 13,
                        backgroundColor: patient.priority === 1 ? '#fef2f2' : patient.priority === 2 ? '#fff7ed' : patient.priority === 3 ? '#fefce8' : '#f0fdf4',
                        color: patient.priority === 1 ? '#b91c1c' : patient.priority === 2 ? '#c2410c' : patient.priority === 3 ? '#a16207' : '#15803d',
                      }}>
                        {patient.priorityLabel}
                      </span>
                    </p>
                  </div>
                )}
                {patient.triage?.reasoning && (
                  <div>
                    <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>AI Triage Reasoning</p>
                    <p style={{ marginTop: 2, fontSize: 13, color: '#555' }}>{patient.triage.reasoning}</p>
                  </div>
                )}
              </div>

              {patient.vitals && (
                <>
                  <h2 style={{ fontSize: 16, marginTop: 20, color: '#444' }}>Vitals</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, margin: '12px 0' }}>
                    {patient.vitals.hr > 0 && (
                      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, textAlign: 'center' as const }}>
                        <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, margin: 0 }}>HR</p>
                        <p style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0 0' }}>{patient.vitals.hr} <span style={{ fontSize: 11, color: '#888' }}>bpm</span></p>
                      </div>
                    )}
                    {patient.vitals.bp && patient.vitals.bp !== '0/0' && (
                      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, textAlign: 'center' as const }}>
                        <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, margin: 0 }}>BP</p>
                        <p style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0 0' }}>{patient.vitals.bp}</p>
                      </div>
                    )}
                    {patient.vitals.spo2 > 0 && (
                      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, textAlign: 'center' as const }}>
                        <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, margin: 0 }}>SpO2</p>
                        <p style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0 0', color: patient.vitals.spo2 < 95 ? '#dc2626' : 'inherit' }}>{patient.vitals.spo2}%</p>
                      </div>
                    )}
                    {patient.vitals.temp > 0 && (
                      <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, textAlign: 'center' as const }}>
                        <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, margin: 0 }}>Temp</p>
                        <p style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0 0' }}>{patient.vitals.temp}&deg;</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <h2 style={{ fontSize: 16, marginTop: 20, color: '#444' }}>Discharge Details</h2>
              <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, margin: '12px 0' }}>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Final Diagnosis</p>
                  <p style={{ marginTop: 2 }}>{dischargeDiagnosis}</p>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Treatment Summary</p>
                  <p style={{ marginTop: 2 }}>{dischargeTreatment}</p>
                </div>
                {dischargeFollowUp && (
                  <div>
                    <p style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase' as const, margin: 0 }}>Follow-up Instructions</p>
                    <p style={{ marginTop: 2 }}>{dischargeFollowUp}</p>
                  </div>
                )}
              </div>

              {patient.triage?.recommendations && patient.triage.recommendations.length > 0 && (
                <>
                  <h2 style={{ fontSize: 16, marginTop: 20, color: '#444' }}>AI Recommendations</h2>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {patient.triage.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{rec}</li>
                    ))}
                  </ul>
                </>
              )}

              <div style={{ marginTop: 40, borderTop: '1px solid #ccc', paddingTop: 16, fontSize: 11, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                <span>Completed by: {user?.name || 'Staff'}</span>
                <span>Generated: {new Date().toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={handlePrintSummary}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Summary
              </button>
              <button
                onClick={() => {
                  setShowDischargeSummary(false);
                  setDischargeDiagnosis('');
                  setDischargeTreatment('');
                  setDischargeFollowUp('');
                  onOpenChange(false);
                }}
                className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

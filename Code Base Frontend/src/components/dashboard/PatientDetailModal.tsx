import { useState, type ReactNode } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { X, Activity, ClipboardList, MessageSquare, Camera, User, Bed, Clock, Hash, Plus, FileText, Pill, LogOut as DischargeIcon, Pencil, ArrowRight, Sparkles, ChevronDown, ChevronUp, BarChart2, FlaskConical, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { PrescribeModal } from './PrescribeModal';
import { DischargeModal } from './DischargeModal';
import { EditPatientModal } from './EditPatientModal';
import { usePatientVitals, usePatientTriageTimeline, useAddVitals, useRecommendTriageShift, useShiftTriage, useTransferToOPD, usePatientNotes, useCreateNote, usePatientPrescriptions } from '@/hooks/usePatientDetails';

interface VitalRecord {
  id: string;
  recordedBy: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  source: 'manual' | 'ocr';
  vitals: {
    hr: number;
    bp: string;
    spo2: number;
    temp: number;
    rr: number;
  };
}

interface TriageEvent {
  id: string;
  from?: number;
  to: number;
  label: string;
  reason: string;
  performer: {
    name: string;
    avatar: string;
  };
  timestamp: string;
}

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
  name: string;
  age: string;
  gender: string;
  avatar?: string;
  complaint: string;
  uhi: string;
  euhi: string;
  assignedDoctor: string;
  bed?: string;
  bedId?: string;
  phone?: string;
  bloodGroup?: string;
  arrivedAt: string;
  triageLevel: number;
  triageLabel: string;
  triageReasoning?: string;
  triageRecommendations?: string[];
  triageConfidence?: number;
  estimatedWaitTime?: string;
  vitalsHistory?: VitalRecord[];
  triageTimeline?: TriageEvent[];
  nurseNotes?: NurseNote[];
  doctorComments?: DoctorComment[];
}

interface PatientDetailModalProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatRecordedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No timestamp';
  // Handle PostgreSQL timestamp format (space instead of T)
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

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago · ${d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function PatientDetailModal({ patient, open, onOpenChange }: PatientDetailModalProps) {
  const { user, canAddNurseNotes, canAddDoctorComments, canDischarge, canPrescribe } = useUser();
  const [activeTab, setActiveTab] = useState<'vitals' | 'triage' | 'notes' | 'doctor' | 'mar' | 'lab' | 'consult'>('vitals');

  // Fetch real vitals and triage data
  const { data: vitalsHistory, isLoading: vitalsLoading } = usePatientVitals(patient?.id || null);
  const { data: triageTimeline, isLoading: triageLoading } = usePatientTriageTimeline(patient?.id || null);

  // Derive latest triage reasoning from independently-fetched triage timeline
  // This ensures reasoning updates live when vitals/prescriptions trigger re-triage
  const latestTriage = triageTimeline && triageTimeline.length > 0 ? triageTimeline[0] : null;
  const liveTriageReasoning = latestTriage?.reasoning || patient?.triageReasoning || null;
  const liveTriageRecommendations = latestTriage?.recommendations || patient?.triageRecommendations || [];
  const liveTriageConfidence = latestTriage?.confidence ?? patient?.triageConfidence ?? null;
  const liveEstimatedWaitTime = latestTriage?.estimatedWaitTime || patient?.estimatedWaitTime || null;
  const liveTriageLevel = latestTriage?.toPriority || patient?.triageLevel || 0;
  const liveTriageLabel = latestTriage?.priorityLabel || patient?.triageLabel || 'Pending Triage';

  // Mutations
  const addVitalsMutation = useAddVitals();
  const recommendTriageMutation = useRecommendTriageShift();
  const shiftTriageMutation = useShiftTriage();
  const transferToOPDMutation = useTransferToOPD();

  // Add Vitals state
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [newVitals, setNewVitals] = useState({
    hr: '',
    bp: '',
    spo2: '',
    temp: '',
    rr: '',
    source: 'manual' as 'manual' | 'ocr'
  });

  // Shift Triage state
  const [showShiftTriage, setShowShiftTriage] = useState(false);
  const [triageRecommendation, setTriageRecommendation] = useState<any>(null);
  const [shiftContext, setShiftContext] = useState({
    procedure: '',
    conditionChange: '',
    notes: ''
  });
  const [selectedNewPriority, setSelectedNewPriority] = useState<number | null>(null);

  // Fetch notes from API (nurse and doctor notes are stored in the same table with different types)
  const { data: nurseNotesData, isLoading: nurseNotesLoading } = usePatientNotes(patient?.id || null, 'nurse');
  const { data: doctorNotesData, isLoading: doctorNotesLoading } = usePatientNotes(patient?.id || null, 'doctor');
  const { data: labOrdersData, isLoading: labOrdersLoading } = usePatientNotes(patient?.id || null, 'lab_order');
  const { data: consultationsData, isLoading: consultationsLoading } = usePatientNotes(patient?.id || null, 'consultation');
  const { data: prescriptionsData, isLoading: prescriptionsLoading } = usePatientPrescriptions(patient?.id || null);
  const createNoteMutation = useCreateNote();

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

  // Lab Orders state
  const [showAddLabOrder, setShowAddLabOrder] = useState(false);
  const [newLabOrder, setNewLabOrder] = useState('');

  // Consultations state
  const [showAddConsultation, setShowAddConsultation] = useState(false);
  const [newConsultation, setNewConsultation] = useState({ specialty: '', reason: '' });

  // Vitals chart toggle
  const [showVitalsChart, setShowVitalsChart] = useState(false);

  // Action modals state
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Expandable reasoning state
  const [showTriageReasoning, setShowTriageReasoning] = useState(false);

  // Push to OPD state
  const [showOPDPrompt, setShowOPDPrompt] = useState(false);
  const [showOPDConfirmation, setShowOPDConfirmation] = useState(false);

  if (!open || !patient) return null;

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

  // Get LLM recommendation for triage shift
  const handleGetTriageRecommendation = async () => {
    try {
      const result = await recommendTriageMutation.mutateAsync({
        patientId: patient.id,
        context: shiftContext
      });
      setTriageRecommendation(result);
      setSelectedNewPriority(result.recommendedPriority);
    } catch (error) {
      console.error('Failed to get triage recommendation:', error);
    }
  };

  // Apply triage shift
  const handleShiftTriage = async () => {
    if (!selectedNewPriority) return;

    try {
      await shiftTriageMutation.mutateAsync({
        patientId: patient.id,
        data: {
          priority: selectedNewPriority,
          reasoning: triageRecommendation?.reasoning || `Manual shift: ${shiftContext.notes}`,
          recommendations: triageRecommendation?.recommendations || [],
          confidence: triageRecommendation?.confidence,
          estimatedWaitTime: triageRecommendation?.estimatedWaitTime
        }
      });
      // Show OPD prompt if this was a downgrade to L3 or L4
      if (selectedNewPriority > (patient.triageLevel || 0) &&
          (selectedNewPriority === 3 || selectedNewPriority === 4)) {
        setShowOPDPrompt(true);
      }
      setShowShiftTriage(false);
      setTriageRecommendation(null);
      setShiftContext({ procedure: '', conditionChange: '', notes: '' });
      setSelectedNewPriority(null);
    } catch (error) {
      console.error('Failed to shift triage:', error);
    }
  };

  const formatTimestamp = () => {
    return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Nurse Notes handlers — persisted to backend
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

  // Doctor Comments handlers — persisted to backend
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

  // Prepare vitals trend chart data (oldest → newest)
  const vitalsChartData = (vitalsHistory || [])
    .slice()
    .reverse()
    .map((record) => {
      const raw = record.recordedAt;
      const normalized = raw?.includes(' ') && !raw?.includes('T') ? raw.replace(' ', 'T') : raw;
      const d = new Date(normalized);
      return {
        time: !isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
        HR: record.hr || null,
        SpO2: record.spo2 || null,
      };
    });

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

  const getTriageBadgeColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-red-100 text-red-800';
      case 2:
        return 'bg-orange-100 text-orange-800';
      case 3:
        return 'bg-yellow-100 text-yellow-800';
      case 4:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isEligibleForOPDTransfer = (): boolean => {
    if (patient.triageLevel !== 3 && patient.triageLevel !== 4) return false;
    if ((patient as any).status !== 'active') return false;
    if (!triageTimeline || triageTimeline.length < 2) return false;
    const latest = triageTimeline[0];
    return latest.fromPriority !== null && latest.toPriority > latest.fromPriority;
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex items-start gap-4 flex-1">
            {patient.avatar ? (
              <img src={patient.avatar} alt={patient.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{patient.name}</h2>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTriageBadgeColor(liveTriageLevel)}`}>
                    {liveTriageLabel}
                  </span>
                  {liveTriageConfidence != null && (
                    <span className="text-[10px] text-muted-foreground">
                      Confidence: {Math.round(liveTriageConfidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {patient.age} • {patient.complaint}
              </p>

              {/* AI Triage Reasoning - Expandable (uses live data from triage timeline) */}
              {liveTriageReasoning && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowTriageReasoning(!showTriageReasoning)}
                    className="w-full flex items-center justify-between p-3 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">AI Triage Reasoning</span>
                      {liveEstimatedWaitTime && (
                        <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                          Est. Wait: {liveEstimatedWaitTime}
                        </span>
                      )}
                    </div>
                    {showTriageReasoning ? (
                      <ChevronUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                  {showTriageReasoning && (
                    <div className="px-3 pb-3 border-t border-blue-200">
                      <p className="text-xs text-blue-900 mt-2">{liveTriageReasoning}</p>
                      {liveTriageRecommendations && liveTriageRecommendations.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[10px] font-medium text-blue-700">Recommendations:</span>
                          <ul className="list-disc list-inside text-[10px] text-blue-800 mt-1">
                            {liveTriageRecommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">UHI (UNIVERSAL)</span>
                  </div>
                  <p className="text-sm font-mono font-semibold text-foreground">{patient.uhi}</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3 h-3 text-orange-600" />
                    <span className="text-xs text-orange-600 font-medium">EUHI (ER ENCOUNTER)</span>
                  </div>
                  <p className="text-sm font-mono font-semibold text-foreground">{patient.euhi}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{patient.assignedDoctor}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bed className="w-3 h-3" />
                  <span>{patient.bed ? `Bed ${patient.bed}` : 'No bed assigned'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Arrived {patient.arrivedAt}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-muted/30">
          {([
            { id: 'vitals', icon: <Activity className="w-3.5 h-3.5" />, label: 'Vitals' },
            { id: 'triage', icon: <ClipboardList className="w-3.5 h-3.5" />, label: 'Triage' },
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
                  <h4 className="text-sm font-semibold mb-3 text-foreground">HR &amp; SpO₂ Trend</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={vitalsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[60, 110]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="HR" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="HR (bpm)" connectNulls />
                      <Line type="monotone" dataKey="SpO2" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="SpO₂ (%)" connectNulls />
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
                      <label className="block text-xs text-blue-700 mb-1">SpO₂ (%)</label>
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
                vitalsHistory.map((record) => (
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
                        {record.source === 'ocr' && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            <Camera className="w-3 h-3" />
                            OCR
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
                        <div className="text-xs text-muted-foreground mb-1">SpO₂</div>
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

          {activeTab === 'triage' && (
            <div className="space-y-4">
              {/* Shift Triage Button */}
              {!showShiftTriage && (
                <button
                  onClick={() => setShowShiftTriage(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Shift Triage Level
                </button>
              )}

              {/* Shift Triage Form */}
              {showShiftTriage && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI-Assisted Triage Shift
                  </h4>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs text-purple-700 mb-1">Procedure/Treatment Done</label>
                      <input
                        type="text"
                        value={shiftContext.procedure}
                        onChange={(e) => setShiftContext({ ...shiftContext, procedure: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm"
                        placeholder="e.g., Surgery completed, medication administered"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-purple-700 mb-1">Condition Change</label>
                      <select
                        value={shiftContext.conditionChange}
                        onChange={(e) => setShiftContext({ ...shiftContext, conditionChange: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm"
                      >
                        <option value="">Select condition change</option>
                        <option value="improved">Condition Improved</option>
                        <option value="stable">Condition Stable</option>
                        <option value="deteriorated">Condition Deteriorated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-purple-700 mb-1">Additional Notes</label>
                      <textarea
                        value={shiftContext.notes}
                        onChange={(e) => setShiftContext({ ...shiftContext, notes: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm resize-none"
                        placeholder="Any additional observations..."
                      />
                    </div>
                  </div>

                  {/* Get AI Recommendation */}
                  <button
                    onClick={handleGetTriageRecommendation}
                    disabled={recommendTriageMutation.isPending}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {recommendTriageMutation.isPending ? 'Getting AI Recommendation...' : 'Get AI Recommendation'}
                  </button>

                  {/* AI Recommendation Result */}
                  {triageRecommendation && (
                    <div className="bg-white border border-purple-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-purple-700">AI Recommendation</span>
                        <span className="text-xs text-muted-foreground">
                          Confidence: {Math.round((triageRecommendation.confidence || 0) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTriageBadgeColor(triageRecommendation.currentPriority)}`}>
                          L{triageRecommendation.currentPriority}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTriageBadgeColor(triageRecommendation.recommendedPriority)}`}>
                          L{triageRecommendation.recommendedPriority} - {triageRecommendation.recommendedLabel?.split(' - ')[1]}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mb-2">{triageRecommendation.reasoning}</p>
                      {triageRecommendation.recommendations?.length > 0 && (
                        <div className="text-xs">
                          <span className="font-medium text-purple-700">Recommendations:</span>
                          <ul className="list-disc list-inside text-muted-foreground mt-1">
                            {triageRecommendation.recommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Priority Selection */}
                  <div className="mb-3">
                    <label className="block text-xs text-purple-700 mb-2">Select New Triage Level</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedNewPriority(level)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            selectedNewPriority === level
                              ? level === 1 ? 'bg-red-100 border-red-300 text-red-800' :
                                level === 2 ? 'bg-orange-100 border-orange-300 text-orange-800' :
                                level === 3 ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                                'bg-green-100 border-green-300 text-green-800'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          L{level} - {level === 1 ? 'Critical' : level === 2 ? 'Emergent' : level === 3 ? 'Urgent' : 'Non-Urgent'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowShiftTriage(false);
                        setTriageRecommendation(null);
                        setShiftContext({ procedure: '', conditionChange: '', notes: '' });
                        setSelectedNewPriority(null);
                      }}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleShiftTriage}
                      disabled={!selectedNewPriority || shiftTriageMutation.isPending}
                      className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
                    >
                      {shiftTriageMutation.isPending ? 'Applying...' : 'Apply Triage Shift'}
                    </button>
                  </div>
                </div>
              )}

              {/* Push to OPD prompt after triage downgrade */}
              {showOPDPrompt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Patient condition has improved
                      </h4>
                      <p className="text-xs text-green-700 mt-1">
                        Triage level was downgraded. This patient may be suitable for outpatient care.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowOPDPrompt(false)}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => { setShowOPDPrompt(false); setShowOPDConfirmation(true); }}
                        className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Push to OPD
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Triage Timeline */}
              {triageLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading triage timeline...</div>
              ) : triageTimeline && triageTimeline.length > 0 ? (
                <div className="space-y-3">
                  {triageTimeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${
                          event.toPriority === 1 ? 'bg-red-600' :
                          event.toPriority === 2 ? 'bg-orange-500' :
                          event.toPriority === 3 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        {index < triageTimeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>

                      <div className="flex-1 pb-4">
                        <div className="bg-muted/30 border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {event.fromPriority && (
                                <>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getTriageBadgeColor(event.fromPriority)}`}>
                                    L{event.fromPriority}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                </>
                              )}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getTriageBadgeColor(event.toPriority)}`}>
                                {event.priorityLabel}
                              </span>
                              {event.source === 'ai' && (
                                <span className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  AI
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRecordedDate(event.createdAt)}
                            </span>
                          </div>
                          {event.reasoning && (
                            <p className="text-sm text-foreground mb-2">{event.reasoning}</p>
                          )}
                          {event.recommendations && event.recommendations.length > 0 && (
                            <div className="mb-2">
                              <span className="text-[10px] font-medium text-muted-foreground">Recommendations:</span>
                              <ul className="list-disc list-inside text-xs text-muted-foreground">
                                {event.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {event.confidence && (
                            <span className="text-[10px] text-muted-foreground">
                              Confidence: {Math.round(event.confidence * 100)}%
                            </span>
                          )}
                          {event.appliedBy && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                                {event.appliedBy.name.charAt(0)}
                              </div>
                              <span className="text-xs text-muted-foreground">{event.appliedBy.name}</span>
                              {event.appliedBy.role && (
                                <span className={`text-[10px] px-1 py-0.5 rounded ${
                                  event.appliedBy.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                                  event.appliedBy.role === 'nurse' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {event.appliedBy.role}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No triage history yet.</p>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              {/* Add Note Button - Only for nurses/admin */}
              {canAddNurseNotes && !showAddNote && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Nurse Note
                </button>
              )}

              {/* Info for doctors */}
              {!canAddNurseNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  You are viewing nurse notes as a {user?.role}. Only nurses can add or edit notes.
                </div>
              )}

              {/* Add Note Form */}
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
                        <option value="Handover">Shift Handover</option>
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

              {/* Existing Notes from API */}
              {nurseNotesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading nurse notes...</div>
              ) : nurseNotesData && nurseNotesData.length > 0 ? (
                nurseNotesData.map((note) => {
                  // Parse category from content "[Category] actual note"
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
                          <span className="font-medium">⚠ Drug Interactions: </span>
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

          {/* Lab Orders */}
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
                labOrdersData.map((order) => (
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

          {/* Consultations */}
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
                consultationsData.map((consult) => {
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

          {/* Doctor Comments Tab */}
          {activeTab === 'doctor' && (
            <div className="space-y-3">
              {/* Add Comment Button - Only for doctors/admin */}
              {canAddDoctorComments && !showAddComment && (
                <button
                  onClick={() => setShowAddComment(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Doctor Comment
                </button>
              )}

              {/* Info for nurses */}
              {!canAddDoctorComments && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                  You are viewing doctor comments as a {user?.role}. Only doctors can add or edit comments.
                </div>
              )}

              {/* Add Comment Form */}
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

              {/* Existing Comments from API */}
              {doctorNotesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading doctor comments...</div>
              ) : doctorNotesData && doctorNotesData.length > 0 ? (
                doctorNotesData.map((comment) => {
                  // Parse type from content "[Type] actual comment"
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
        </div>

        {/* Footer with role-specific actions */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit Patient
            </button>
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
                Discharge
              </button>
            )}
            {canDischarge && isEligibleForOPDTransfer() && (
              <button
                onClick={() => setShowOPDConfirmation(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                <ArrowRight className="w-4 h-4" />
                Push to OPD
              </button>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Transfer to OPD Confirmation */}
      {showOPDConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Transfer to OPD</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to transfer <strong>{patient.name}</strong> to Outpatient Department?
              This will release their current bed and move them out of the ER queue.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowOPDConfirmation(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await transferToOPDMutation.mutateAsync({ patientId: patient.id });
                    setShowOPDConfirmation(false);
                    onOpenChange(false);
                  } catch (error) {
                    console.error('Failed to transfer to OPD:', error);
                    setShowOPDConfirmation(false);
                  }
                }}
                disabled={transferToOPDMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {transferToOPDMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescribe Modal */}
      <PrescribeModal
        patientName={patient.name}
        patientId={patient.id}
        open={showPrescribeModal}
        onOpenChange={setShowPrescribeModal}
      />

      {/* Discharge Modal */}
      <DischargeModal
        patientName={patient.name}
        patientId={patient.id}
        department="ER"
        open={showDischargeModal}
        onOpenChange={setShowDischargeModal}
        onDischarged={() => onOpenChange(false)}
        patientAge={patient.age}
        patientGender={patient.gender}
        patientUhi={patient.uhi}
        patientComplaint={patient.complaint}
        patientDoctor={patient.assignedDoctor}
        patientPhone={patient.phone}
        patientBloodGroup={patient.bloodGroup}
        patientTriageLabel={patient.triageLabel}
        patientTriageReasoning={patient.triageReasoning}
        patientTriageRecommendations={patient.triageRecommendations}
        patientVitals={patient.vitalsHistory && patient.vitalsHistory.length > 0 ? patient.vitalsHistory[0].vitals : undefined}
      />

      {/* Edit Patient Modal */}
      <EditPatientModal
        patient={patient}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />
    </div>
  );
}

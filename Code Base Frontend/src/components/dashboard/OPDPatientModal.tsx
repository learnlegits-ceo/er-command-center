import { useState, useRef } from 'react';
import { X, Plus, MessageSquare, FileText, Pill, LogOut as DischargeIcon, Pencil, Brain, AlertTriangle, CheckCircle2, Clock, ChevronRight, Printer, UserX, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useDischargePatient, usePatientNotes, useCreateNote } from '@/hooks/usePatientDetails';
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

export function OPDPatientModal({ patient, open, onOpenChange }: OPDPatientModalProps) {
  const { user, canAddNurseNotes, canAddDoctorComments, canDischarge, canPrescribe, canRegisterPatients } = useUser();

  // Fetch notes from API
  const { data: nurseNotesData, isLoading: nurseNotesLoading } = usePatientNotes(patient?.id || null, 'nurse');
  const { data: doctorNotesData, isLoading: doctorNotesLoading } = usePatientNotes(patient?.id || null, 'doctor');
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

  const formatRecordedDate = (dateStr: string | null | undefined): string => {
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
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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

  // Triage helpers
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

        {/* Patient IDs and Details */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">UHI (Universal)</p>
              <div className="inline-flex items-center px-3 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                {patient.uhi}
              </div>
            </div>
            {patient.tags?.includes('ER Referral') && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">EUHI (ER Encounter)</p>
                <div className="inline-flex items-center px-3 py-1 rounded bg-orange-100 text-orange-700 font-medium">
                  {patient.euhi}
                </div>
              </div>
            )}
            <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">Doctor:</span>
                <span>{patient.doctor}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Bed:</span>
                <span>{patient.bed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">Patient Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Age & Gender</p>
                  <p className="text-sm font-medium text-foreground">{patient.age}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Blood Group</p>
                  <p className="text-sm font-medium text-red-600">{patient.bloodGroup}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contact</p>
                  <p className="text-sm font-medium text-foreground">{patient.phone}</p>
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">Visit Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Purpose of Visit</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{patient.purpose}</p>
                    {patient.tags?.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assigned Doctor</p>
                  <p className="text-sm font-medium text-foreground">{patient.doctor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Consultation Bed</p>
                  <p className="text-sm font-medium text-foreground">{patient.bed}</p>
                </div>
              </div>
            </div>

            {/* AI Triage Assessment */}
            {patient.triage && patient.priority && (
              <div className={`rounded-lg p-4 border ${getPriorityBgColor(patient.priority)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-foreground">AI Triage Assessment</h3>
                </div>

                {/* Priority Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={getPriorityTextColor(patient.priority)}>
                      {patient.priority <= 2 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </span>
                    <div>
                      <p className={`font-semibold ${getPriorityTextColor(patient.priority)}`}>
                        {patient.priorityLabel || `Level ${patient.priority}`}
                      </p>
                      {patient.triage.confidence > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Confidence: {Math.round(patient.triage.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                  {patient.triage.estimatedWaitTime && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Est. wait: {patient.triage.estimatedWaitTime}</span>
                    </div>
                  )}
                </div>

                {/* Reasoning */}
                {patient.triage.reasoning && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-foreground mb-1">Reasoning</p>
                    <p className="text-sm text-muted-foreground bg-background/60 rounded-lg p-3">
                      {patient.triage.reasoning}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {patient.triage.recommendations && patient.triage.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1">
                      {patient.triage.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Nurse Notes Section */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Nurse Notes
                </h3>
                {canAddNurseNotes && !showAddNote && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Note
                  </button>
                )}
              </div>

              {/* Info for non-nurses */}
              {!canAddNurseNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mb-3">
                  You are viewing as a {user?.role}. Only nurses can add or edit notes.
                </div>
              )}

              {/* Add Note Form */}
              {showAddNote && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
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

              {/* Notes List from API */}
              <div className="space-y-2">
                {nurseNotesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading nurse notes...</div>
                ) : nurseNotesData && nurseNotesData.length > 0 ? (
                  nurseNotesData.map((note) => {
                    const categoryMatch = note.content.match(/^\[(\w+)\]\s*/);
                    const category = categoryMatch ? categoryMatch[1] : 'General';
                    const noteText = categoryMatch ? note.content.slice(categoryMatch[0].length) : note.content;

                    return (
                      <div key={note.id} className="bg-background border rounded-lg p-3">
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
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No nurse notes yet.{canAddNurseNotes && ' Click "Add Note" to create one.'}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Doctor Comments Section */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Doctor Comments
                </h3>
                {canAddDoctorComments && !showAddComment && (
                  <button
                    onClick={() => setShowAddComment(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Comment
                  </button>
                )}
              </div>

              {/* Info for non-doctors */}
              {!canAddDoctorComments && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 mb-3">
                  You are viewing as a {user?.role}. Only doctors can add or edit comments.
                </div>
              )}

              {/* Add Comment Form */}
              {showAddComment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
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

              {/* Comments List from API */}
              <div className="space-y-2">
                {doctorNotesLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading doctor comments...</div>
                ) : doctorNotesData && doctorNotesData.length > 0 ? (
                  doctorNotesData.map((comment) => {
                    const typeMatch = comment.content.match(/^\[(\w+)\]\s*/);
                    const commentType = typeMatch ? typeMatch[1] : 'General';
                    const commentText = typeMatch ? comment.content.slice(typeMatch[0].length) : comment.content;

                    return (
                      <div key={comment.id} className="bg-background border rounded-lg p-3">
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
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No doctor comments yet.{canAddDoctorComments && ' Click "Add Comment" to create one.'}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Clinical Notes Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Clinical Notes</h3>
              <p className="text-sm text-blue-800">
                {patient.tags?.includes('ER Referral')
                  ? 'Patient referred from Emergency Department. Previous ER records available in system.'
                  : 'Regular OPD consultation. No emergency history.'}
              </p>
            </div>
          </div>
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

              {/* Patient Info */}
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

              {/* Visit Details */}
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

              {/* Vitals at Time of Visit */}
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

              {/* Discharge Details */}
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

              {/* Recommendations */}
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

              {/* Footer */}
              <div style={{ marginTop: 40, borderTop: '1px solid #ccc', paddingTop: 16, fontSize: 11, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                <span>Completed by: {user?.name || 'Staff'}</span>
                <span>Generated: {new Date().toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Modal Footer */}
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

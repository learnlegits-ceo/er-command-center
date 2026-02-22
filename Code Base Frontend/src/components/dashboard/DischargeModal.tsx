import { useState, useRef } from 'react';
import { X, LogOut, CheckCircle, AlertTriangle, Printer, Download, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useDischargePatient } from '@/hooks/usePatientDetails';
import html2pdf from 'html2pdf.js';

interface DischargeModalProps {
  patientName: string;
  patientId: string;
  department: 'ER' | 'OPD';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDischarged?: () => void;
  // Patient data for discharge summary
  patientAge?: string;
  patientGender?: string;
  patientUhi?: string;
  patientComplaint?: string;
  patientDoctor?: string;
  patientPhone?: string;
  patientBloodGroup?: string;
  patientTriageLabel?: string;
  patientTriageReasoning?: string;
  patientTriageRecommendations?: string[];
  patientVitals?: { hr?: number; bp?: string; spo2?: number; temp?: number };
}

interface DischargeData {
  patientId: string;
  dischargeType: string;
  diagnosis: string;
  treatmentSummary: string;
  followUpDate: string;
  followUpInstructions: string;
  dischargedBy: string;
  timestamp: string;
}

const dischargeTypes = {
  ER: [
    'Discharged - Stable',
    'Discharged - Against Medical Advice (AMA)',
    'Transferred to Ward',
    'Transferred to ICU',
    'Referred to OPD',
    'Referred to Specialist'
  ],
  OPD: [
    'Consultation Complete',
    'Follow-up Required',
    'Referred to Specialist',
    'Admitted to Ward',
    'Referred to ER',
    'Treatment Complete'
  ]
};

export function DischargeModal({
  patientName, patientId, department, open, onOpenChange, onDischarged,
  patientAge, patientGender, patientUhi, patientComplaint, patientDoctor,
  patientPhone, patientBloodGroup, patientTriageLabel, patientTriageReasoning,
  patientTriageRecommendations, patientVitals
}: DischargeModalProps) {
  const { user } = useUser();
  const dischargePatient = useDischargePatient();
  const summaryRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    dischargeType: department === 'ER' ? 'Discharged - Stable' : 'Consultation Complete',
    diagnosis: '',
    treatmentSummary: '',
    followUpDate: '',
    followUpInstructions: ''
  });
  const [showSummary, setShowSummary] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [dischargeError, setDischargeError] = useState('');
  const [savedDischargeData, setSavedDischargeData] = useState<DischargeData | null>(null);

  if (!open) return null;

  const isAMA = formData.dischargeType.includes('Against Medical Advice');
  const requiresFollowUp = formData.dischargeType.includes('Follow-up') || formData.dischargeType.includes('Referred');

  const handleSubmit = async () => {
    if (!formData.diagnosis || !formData.treatmentSummary) return;

    if (isAMA && !showWarning) {
      setShowWarning(true);
      return;
    }

    setDischargeError('');

    // Build discharge notes from all form fields
    let notes = `Type: ${formData.dischargeType}\nDiagnosis: ${formData.diagnosis}\nTreatment: ${formData.treatmentSummary}`;
    if (formData.followUpInstructions) {
      notes += `\nFollow-up: ${formData.followUpInstructions}`;
    }

    try {
      await dischargePatient.mutateAsync({
        patientId,
        data: {
          discharge_notes: notes,
          follow_up_date: formData.followUpDate || undefined,
        }
      });

      // Save the discharge data for summary display
      setSavedDischargeData({
        patientId,
        ...formData,
        dischargedBy: user?.name || 'Unknown',
        timestamp: new Date().toISOString()
      });

      setShowSummary(true);
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
      <html><head><title>Discharge Summary - ${patientName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
        h1 { font-size: 22px; border-bottom: 3px solid #7c3aed; padding-bottom: 8px; color: #7c3aed; }
        h2 { font-size: 15px; margin-top: 20px; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .header-right { text-align: right; font-size: 12px; color: #666; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
        .field-label { font-weight: bold; color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-value { margin-top: 2px; font-size: 14px; }
        .section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 12px 0; }
        .vitals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin: 12px 0; }
        .vital-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
        .vital-value { font-size: 18px; font-weight: bold; margin: 4px 0 0; }
        .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 14px; font-size: 11px; color: #888; display: flex; justify-content: space-between; }
        .signature { margin-top: 40px; display: flex; justify-content: flex-end; }
        .signature-box { border-top: 1px solid #333; width: 200px; padding-top: 6px; text-align: center; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${summaryRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadSummary = () => {
    if (!summaryRef.current) return;
    const filename = `Discharge_Summary_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const opt = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    };
    html2pdf().set(opt).from(summaryRef.current).save();
  };

  const handleClose = () => {
    setShowSummary(false);
    setSavedDischargeData(null);
    setFormData({
      dischargeType: department === 'ER' ? 'Discharged - Stable' : 'Consultation Complete',
      diagnosis: '',
      treatmentSummary: '',
      followUpDate: '',
      followUpInstructions: ''
    });
    setShowWarning(false);
    setDischargeError('');
    onOpenChange(false);
    onDischarged?.();
  };

  // ── Discharge Summary View ──
  if (showSummary && savedDischargeData) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {department === 'ER' ? 'Patient Discharged' : 'Visit Completed'}
                </h3>
                <p className="text-sm text-gray-500">{patientName} - Discharge Summary</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSummary}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={handlePrintSummary}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Summary Content */}
          <div className="flex-1 overflow-y-auto p-6" ref={summaryRef}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, borderBottom: '3px solid #7c3aed', paddingBottom: 8, margin: 0, color: '#7c3aed' }}>
                  Discharge Summary
                </h1>
                <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>ER Command Center - Healthcare Management System</p>
              </div>
              <div style={{ textAlign: 'right' as const, fontSize: 12, color: '#666' }}>
                <p style={{ margin: 0 }}>Date: {dateStr}</p>
                <p style={{ margin: 0 }}>Time: {timeStr}</p>
                <p style={{ margin: 0 }}>Ref: DS-{Date.now().toString(36).toUpperCase()}</p>
              </div>
            </div>

            {/* Patient Information */}
            <h2 style={{ fontSize: 14, marginTop: 20, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Patient Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
              <div>
                <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Name</p>
                <p style={{ marginTop: 2, fontSize: 14 }}>{patientName}</p>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Patient ID</p>
                <p style={{ marginTop: 2, fontSize: 14 }}>{patientUhi || patientId.substring(0, 8).toUpperCase()}</p>
              </div>
              {patientAge && (
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Age / Gender</p>
                  <p style={{ marginTop: 2, fontSize: 14 }}>{patientAge}{patientGender ? ` / ${patientGender}` : ''}</p>
                </div>
              )}
              {patientBloodGroup && (
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Blood Group</p>
                  <p style={{ marginTop: 2, fontSize: 14 }}>{patientBloodGroup}</p>
                </div>
              )}
              {patientDoctor && (
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Attending Doctor</p>
                  <p style={{ marginTop: 2, fontSize: 14 }}>{patientDoctor}</p>
                </div>
              )}
              {patientPhone && (
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Contact</p>
                  <p style={{ marginTop: 2, fontSize: 14 }}>{patientPhone}</p>
                </div>
              )}
            </div>

            {/* Visit Details */}
            {patientComplaint && (
              <>
                <h2 style={{ fontSize: 14, marginTop: 20, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Visit Details</h2>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, margin: '12px 0' }}>
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Chief Complaint</p>
                    <p style={{ marginTop: 2, fontSize: 14 }}>{patientComplaint}</p>
                  </div>
                  {patientTriageLabel && (
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Triage Level</p>
                      <p style={{ marginTop: 4, fontSize: 13, fontWeight: 600 }}>{patientTriageLabel}</p>
                    </div>
                  )}
                  {patientTriageReasoning && (
                    <div>
                      <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>AI Triage Reasoning</p>
                      <p style={{ marginTop: 2, fontSize: 13, color: '#555' }}>{patientTriageReasoning}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Vitals */}
            {patientVitals && (patientVitals.hr || patientVitals.bp || patientVitals.spo2 || patientVitals.temp) && (
              <>
                <h2 style={{ fontSize: 14, marginTop: 20, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Vitals at Discharge</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, margin: '12px 0' }}>
                  {patientVitals.hr != null && patientVitals.hr > 0 && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, textAlign: 'center' as const }}>
                      <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, margin: 0 }}>HR</p>
                      <p style={{ fontSize: 18, fontWeight: 'bold', margin: '4px 0 0' }}>{patientVitals.hr} <span style={{ fontSize: 11, color: '#888' }}>bpm</span></p>
                    </div>
                  )}
                  {patientVitals.bp && patientVitals.bp !== '0/0' && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, textAlign: 'center' as const }}>
                      <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, margin: 0 }}>BP</p>
                      <p style={{ fontSize: 18, fontWeight: 'bold', margin: '4px 0 0' }}>{patientVitals.bp}</p>
                    </div>
                  )}
                  {patientVitals.spo2 != null && patientVitals.spo2 > 0 && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, textAlign: 'center' as const }}>
                      <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, margin: 0 }}>SpO2</p>
                      <p style={{ fontSize: 18, fontWeight: 'bold', margin: '4px 0 0', color: patientVitals.spo2 < 95 ? '#dc2626' : 'inherit' }}>{patientVitals.spo2}%</p>
                    </div>
                  )}
                  {patientVitals.temp != null && patientVitals.temp > 0 && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, textAlign: 'center' as const }}>
                      <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, margin: 0 }}>Temp</p>
                      <p style={{ fontSize: 18, fontWeight: 'bold', margin: '4px 0 0' }}>{patientVitals.temp}&deg;</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Discharge Details */}
            <h2 style={{ fontSize: 14, marginTop: 20, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>Discharge Details</h2>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, margin: '12px 0' }}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Discharge Type</p>
                <p style={{ marginTop: 2, fontSize: 14, fontWeight: 600 }}>{savedDischargeData.dischargeType}</p>
              </div>
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Final Diagnosis</p>
                <p style={{ marginTop: 2, fontSize: 14 }}>{savedDischargeData.diagnosis}</p>
              </div>
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Treatment Summary</p>
                <p style={{ marginTop: 2, fontSize: 14 }}>{savedDischargeData.treatmentSummary}</p>
              </div>
              {savedDischargeData.followUpDate && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Follow-up Date</p>
                  <p style={{ marginTop: 2, fontSize: 14 }}>{new Date(savedDischargeData.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
              {savedDischargeData.followUpInstructions && (
                <div>
                  <p style={{ fontWeight: 'bold', color: '#555', fontSize: 10, textTransform: 'uppercase' as const, margin: 0 }}>Follow-up Instructions</p>
                  <p style={{ marginTop: 2, fontSize: 14 }}>{savedDischargeData.followUpInstructions}</p>
                </div>
              )}
            </div>

            {/* AI Recommendations */}
            {patientTriageRecommendations && patientTriageRecommendations.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, marginTop: 20, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #e5e7eb', paddingBottom: 4 }}>AI Recommendations</h2>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  {patientTriageRecommendations.map((rec, idx) => (
                    <li key={idx} style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{rec}</li>
                  ))}
                </ul>
              </>
            )}

            {/* Signature */}
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                <p style={{ margin: 0 }}>{department === 'ER' ? 'Discharged' : 'Completed'} by: <strong>{savedDischargeData.dischargedBy}</strong></p>
              </div>
              <div style={{ borderTop: '1px solid #333', width: 200, paddingTop: 6, textAlign: 'center' as const }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.role === 'doctor' ? 'Dr. ' : ''}{savedDischargeData.dischargedBy}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{user?.role === 'doctor' ? 'Discharging Physician' : user?.role === 'nurse' ? 'Discharging Nurse' : 'Discharging Staff'}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 12, fontSize: 10, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
              <span>This is a computer-generated discharge summary.</span>
              <span>Generated: {now.toLocaleString('en-IN')}</span>
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
              onClick={handleDownloadSummary}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Discharge Form ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {department === 'ER' ? 'Discharge Patient' : 'Complete Visit'}
            </h3>
            <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error message */}
          {dischargeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{dischargeError}</p>
            </div>
          )}

          {/* AMA Warning */}
          {showWarning && isAMA && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Against Medical Advice (AMA)</h4>
                  <p className="text-sm text-red-700 mt-1">
                    The patient is being discharged against medical advice. Please ensure all risks have been explained and documented.
                  </p>
                  <p className="text-sm text-red-700 mt-2 font-medium">
                    Click "Confirm Discharge" again to proceed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Discharge Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {department === 'ER' ? 'Discharge Type' : 'Visit Outcome'}
            </label>
            <select
              value={formData.dischargeType}
              onChange={(e) => {
                setFormData({ ...formData, dischargeType: e.target.value });
                setShowWarning(false);
              }}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              {dischargeTypes[department].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Final Diagnosis *</label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Enter primary diagnosis"
            />
          </div>

          {/* Treatment Summary */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Treatment Summary *</label>
            <textarea
              value={formData.treatmentSummary}
              onChange={(e) => setFormData({ ...formData, treatmentSummary: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              placeholder="Summary of treatment provided..."
            />
          </div>

          {/* Follow-up Section */}
          {requiresFollowUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Follow-up Instructions</label>
                <textarea
                  value={formData.followUpInstructions}
                  onChange={(e) => setFormData({ ...formData, followUpInstructions: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  placeholder="Instructions for follow-up visit..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {department === 'ER' ? 'Discharged' : 'Completed'} by: {user?.name}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowWarning(false);
                onOpenChange(false);
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.diagnosis || !formData.treatmentSummary || dischargePatient.isPending}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isAMA
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {dischargePatient.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Discharging...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  {showWarning && isAMA ? 'Confirm Discharge' : (department === 'ER' ? 'Discharge Patient' : 'Complete Visit')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

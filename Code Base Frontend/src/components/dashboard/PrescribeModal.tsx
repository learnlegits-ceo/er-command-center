import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Search, Loader2, Printer, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useCreatePrescription } from '@/hooks/usePatientDetails';
import { endpoints } from '@/lib/api';
import html2pdf from 'html2pdf.js';

interface MedicationOption {
  id: string;
  name: string;
  genericName: string;
  code?: string;
  form: string;
  strengths: string[];
  category: string;
  manufacturer?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescribeModalProps {
  patientName: string;
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrescribe?: (medications: Medication[]) => void;
}

const frequencies = [
  'Once daily (OD)',
  'Twice daily (BD)',
  'Three times daily (TDS)',
  'Four times daily (QDS)',
  'Every 6 hours',
  'Every 8 hours',
  'As needed (PRN)',
  'At bedtime (HS)'
];

const durations = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  'Ongoing',
  'As directed'
];

// ── Debounce helper for search-engine style queries ──
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Prescription PDF HTML Generator ──
function generatePrescriptionHTML(
  patientName: string,
  patientId: string,
  medications: Medication[],
  notes: string,
  doctorName: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const medsRows = medications.map((med, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#7c3aed;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
        <div style="font-weight:600;color:#1a1a1a;">${med.name}</div>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${med.dosage}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${med.frequency}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${med.duration}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-style:italic;color:#666;">${med.instructions || '-'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Prescription - ${patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 0; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { border-bottom: 3px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .hospital-name { font-size: 24px; font-weight: 700; color: #7c3aed; }
    .hospital-sub { font-size: 12px; color: #666; margin-top: 4px; }
    .rx-symbol { font-size: 36px; font-weight: 700; color: #7c3aed; font-family: serif; }
    .rx-date { text-align: right; font-size: 12px; color: #666; }
    .rx-date p { margin-bottom: 2px; }
    .patient-info { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .patient-info .field-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #7c3aed; letter-spacing: 0.5px; }
    .patient-info .field-value { font-size: 14px; margin-top: 2px; }
    .section-title { font-size: 14px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #7c3aed; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:first-child { border-radius: 6px 0 0 0; text-align: center; }
    thead th:last-child { border-radius: 0 6px 0 0; }
    tbody td { font-size: 13px; }
    tbody tr:nth-child(even) { background: #faf5ff; }
    .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
    .notes-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #92400e; margin-bottom: 4px; }
    .notes-text { font-size: 13px; color: #78350f; }
    .signature-area { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-line { border-top: 1px solid #333; width: 200px; padding-top: 6px; text-align: center; }
    .signature-name { font-weight: 600; font-size: 14px; }
    .signature-desg { font-size: 11px; color: #666; }
    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(124,58,237,0.04); font-weight: 900; pointer-events: none; z-index: 0; }
    @media print {
      body { padding: 0; }
      .page { padding: 20px 30px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="watermark">PRESCRIPTION</div>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div>
          <div class="hospital-name">ER Command Center</div>
          <div class="hospital-sub">Healthcare Management System</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:20px;">
          <div class="rx-symbol">&#8478;</div>
          <div class="rx-date">
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
            <p><strong>Rx ID:</strong> RX-${Date.now().toString(36).toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="patient-info">
      <div>
        <div class="field-label">Patient Name</div>
        <div class="field-value">${patientName}</div>
      </div>
      <div>
        <div class="field-label">Patient ID</div>
        <div class="field-value">${patientId.substring(0, 8).toUpperCase()}</div>
      </div>
    </div>

    <div class="section-title">Prescribed Medications</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${medsRows}
      </tbody>
    </table>

    ${notes ? `
    <div class="notes-box">
      <div class="notes-label">Additional Notes</div>
      <div class="notes-text">${notes}</div>
    </div>
    ` : ''}

    <div class="signature-area">
      <div>
        <p style="font-size:12px;color:#666;">Total Medications: <strong>${medications.length}</strong></p>
      </div>
      <div class="signature-line">
        <div class="signature-name">Dr. ${doctorName}</div>
        <div class="signature-desg">Prescribing Physician</div>
      </div>
    </div>

    <div class="footer">
      <span>This is a computer-generated prescription.</span>
      <span>Generated: ${now.toLocaleString('en-IN')}</span>
    </div>
  </div>
</body>
</html>`;
}

export function PrescribeModal({ patientName, patientId, open, onOpenChange, onPrescribe }: PrescribeModalProps) {
  const { user } = useUser();
  const createPrescriptionMutation = useCreatePrescription();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMed, setCurrentMed] = useState({
    name: '',
    dosage: '',
    frequency: 'Twice daily (BD)',
    duration: '5 days',
    instructions: ''
  });
  const [notes, setNotes] = useState('');
  const [showPrescriptionSummary, setShowPrescriptionSummary] = useState(false);
  const [prescribedMeds, setPrescribedMeds] = useState<Medication[]>([]);
  const [prescribedNotes, setPrescribedNotes] = useState('');

  // Drug interaction tracking — store names of added meds for client-side check
  const [addedMedOptions, setAddedMedOptions] = useState<{name: string; genericName: string}[]>([]);
  const prescriptionRef = useRef<HTMLDivElement>(null);

  // Search-engine style medication search state
  const [localMeds, setLocalMeds] = useState<MedicationOption[]>([]);
  const [suggestions, setSuggestions] = useState<MedicationOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationOption | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const localMedsLoaded = useRef(false);

  // Debounced search for API fallback (longer delay since local is instant)
  const debouncedQuery = useDebounce(searchQuery, 600);

  // Pre-load local medication database once (276+ Indian drugs - instant filtering)
  useEffect(() => {
    if (!open || localMedsLoaded.current) return;

    endpoints.patients.searchMedications('')
      .then((res) => {
        const meds: MedicationOption[] = res.data?.data || [];
        setLocalMeds(meds);
        localMedsLoaded.current = true;
      })
      .catch(() => {});
  }, [open]);

  // INSTANT local filtering as doctor types (no API call needed)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const exact: MedicationOption[] = [];
    const startsWith: MedicationOption[] = [];
    const contains: MedicationOption[] = [];

    for (const med of localMeds) {
      const name = med.name.toLowerCase();
      const generic = med.genericName.toLowerCase();
      const category = med.category.toLowerCase();
      const manufacturer = (med.manufacturer || '').toLowerCase();

      if (name === q || generic === q) {
        exact.push(med);
      } else if (name.startsWith(q) || generic.startsWith(q)) {
        startsWith.push(med);
      } else if (name.includes(q) || generic.includes(q) || category.includes(q) || manufacturer.includes(q)) {
        contains.push(med);
      }
    }

    const localResults = [...exact, ...startsWith, ...contains].slice(0, 15);
    setSuggestions(localResults);
    setHighlightIndex(-1);
  }, [searchQuery, localMeds]);

  // Background API search ONLY when local results are sparse (enriches with RxNorm/LLM)
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 3) return;
    if (suggestions.length >= 5) return; // enough local results, skip API

    let cancelled = false;
    setIsSearching(true);

    endpoints.patients.searchMedications(debouncedQuery)
      .then((res) => {
        if (cancelled) return;
        const apiMeds: MedicationOption[] = res.data?.data || [];
        // Merge API results with existing local results (dedup by name)
        const existingNames = new Set(suggestions.map(m => m.name.toLowerCase()));
        const newMeds = apiMeds.filter(m => !existingNames.has(m.name.toLowerCase()));
        if (newMeds.length > 0) {
          setSuggestions(prev => [...prev, ...newMeds].slice(0, 15));
          // Also add to local cache for future instant filtering
          setLocalMeds(prev => {
            const prevNames = new Set(prev.map(m => m.name.toLowerCase()));
            const toAdd = newMeds.filter(m => !prevNames.has(m.name.toLowerCase()));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelectMedication = useCallback((med: MedicationOption) => {
    setSelectedMed(med);
    setSearchQuery(med.name);
    setCurrentMed(prev => ({ ...prev, name: med.name }));
    setShowSuggestions(false);
  }, []);

  const handleUseTypedName = useCallback(() => {
    if (!searchQuery.trim()) return;
    setSelectedMed(null);
    setCurrentMed(prev => ({ ...prev, name: searchQuery.trim() }));
    setShowSuggestions(false);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUseTypedName();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0) {
        handleSelectMedication(suggestions[highlightIndex]);
      } else {
        handleUseTypedName();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handlePrintPrescription = () => {
    const html = generatePrescriptionHTML(
      patientName, patientId, prescribedMeds, prescribedNotes, user?.name || 'Doctor'
    );
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPrescription = () => {
    const html = generatePrescriptionHTML(
      patientName, patientId, prescribedMeds, prescribedNotes, user?.name || 'Doctor'
    );
    // Create a temporary container to render the HTML for pdf conversion
    const container = document.createElement('div');
    container.innerHTML = html;
    // Extract just the body content (skip <!DOCTYPE>, <html>, <head> etc.)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const pdfContainer = document.createElement('div');
    if (styleMatch) {
      const style = document.createElement('style');
      style.textContent = styleMatch[1];
      pdfContainer.appendChild(style);
    }
    pdfContainer.innerHTML += bodyMatch ? bodyMatch[1] : html;

    const filename = `Prescription_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const opt = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    html2pdf().set(opt).from(pdfContainer).save();
  };

  if (!open) return null;

  // ── Drug interaction checker (client-side, keyword-based) ──
  function checkInteractions(meds: {name: string; genericName: string}[]): string[] {
    const warnings: string[] = [];
    const joined = meds.map(m => `${m.name} ${m.genericName}`.toLowerCase()).join(' | ');
    const has = (keyword: string) => joined.includes(keyword.toLowerCase());

    if (has('warfarin') && (has('aspirin') || has('ibuprofen') || has('diclofenac') || has('naproxen') || has('ketorolac'))) {
      warnings.push('Warfarin + NSAID/Aspirin: high bleeding risk — monitor INR closely');
    }
    if (has('digoxin') && has('amiodarone')) {
      warnings.push('Digoxin + Amiodarone: digoxin toxicity risk — consider dose reduction');
    }
    if ((has('lisinopril') || has('enalapril') || has('ramipril') || has('captopril')) &&
        (has('spironolactone') || has('eplerenone'))) {
      warnings.push('ACE inhibitor + K-sparing diuretic: hyperkalemia risk — monitor potassium');
    }
    if (has('methotrexate') && (has('ibuprofen') || has('naproxen') || has('diclofenac'))) {
      warnings.push('Methotrexate + NSAID: methotrexate toxicity risk — avoid combination');
    }
    if (has('clopidogrel') && has('omeprazole')) {
      warnings.push('Clopidogrel + Omeprazole: reduced antiplatelet effect — consider pantoprazole');
    }
    if ((has('ciprofloxacin') || has('levofloxacin')) && has('theophylline')) {
      warnings.push('Fluoroquinolone + Theophylline: theophylline toxicity risk');
    }
    // Multiple antibiotics
    const abxPatterns = ['amoxicillin','ciprofloxacin','azithromycin','metronidazole','doxycycline','cephalexin','clindamycin'];
    if (abxPatterns.filter(a => has(a)).length >= 2) {
      warnings.push('Multiple antibiotics: verify indication and check for duplicate therapy');
    }

    return warnings;
  }

  const handleAddMedication = () => {
    if (!currentMed.name || !currentMed.dosage) return;

    const medication: Medication = {
      id: `med${Date.now()}`,
      ...currentMed
    };

    setMedications([...medications, medication]);
    setAddedMedOptions(prev => [...prev, {
      name: currentMed.name,
      genericName: selectedMed?.genericName || ''
    }]);
    setCurrentMed({
      name: '',
      dosage: '',
      frequency: 'Twice daily (BD)',
      duration: '5 days',
      instructions: ''
    });
    setSearchQuery('');
    setSelectedMed(null);
  };

  const handleRemoveMedication = (id: string) => {
    const med = medications.find(m => m.id === id);
    if (med) {
      setAddedMedOptions(prev => {
        const idx = prev.findIndex(o => o.name === med.name);
        return idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;
      });
    }
    setMedications(medications.filter(m => m.id !== id));
  };

  const handleSubmit = async () => {
    if (medications.length === 0) return;

    try {
      for (const med of medications) {
        await createPrescriptionMutation.mutateAsync({
          patientId,
          data: {
            medication_name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions || notes || undefined,
          }
        });
      }

      onPrescribe?.(medications);
      // Save prescribed data for the summary view
      setPrescribedMeds([...medications]);
      setPrescribedNotes(notes);
      setShowPrescriptionSummary(true);
    } catch (error) {
      console.error('Failed to create prescription:', error);
    }
  };

  const handleCloseSummary = () => {
    setShowPrescriptionSummary(false);
    setPrescribedMeds([]);
    setPrescribedNotes('');
    setMedications([]);
    setAddedMedOptions([]);
    setNotes('');
    setSearchQuery('');
    setSelectedMed(null);
    onOpenChange(false);
  };

  // ── Prescription Summary (Printable / Downloadable) ──
  if (showPrescriptionSummary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Prescription Created</h3>
                <p className="text-sm text-gray-500">{prescribedMeds.length} medication(s) for {patientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPrescription}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handlePrintPrescription}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button onClick={handleCloseSummary} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Prescription Content */}
          <div className="flex-1 overflow-y-auto p-6" ref={prescriptionRef}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #7c3aed', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>ER Command Center</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Healthcare Management System</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: '#7c3aed', fontFamily: 'serif' }}>&#8478;</span>
                <div style={{ textAlign: 'right' as const, fontSize: 12, color: '#666' }}>
                  <p style={{ margin: 0 }}>Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p style={{ margin: 0 }}>Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            {/* Patient Info */}
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase' as const, fontWeight: 700, color: '#7c3aed', letterSpacing: 0.5, margin: 0 }}>Patient Name</p>
                <p style={{ fontSize: 14, marginTop: 2 }}>{patientName}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, textTransform: 'uppercase' as const, fontWeight: 700, color: '#7c3aed', letterSpacing: 0.5, margin: 0 }}>Patient ID</p>
                <p style={{ fontSize: 14, marginTop: 2 }}>{patientId.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Medications Table */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
              Prescribed Medications
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ background: '#7c3aed', color: 'white', padding: '8px 10px', textAlign: 'center' as const, fontSize: 11, textTransform: 'uppercase' as const, borderRadius: '6px 0 0 0' }}>#</th>
                  <th style={{ background: '#7c3aed', color: 'white', padding: '8px 10px', textAlign: 'left' as const, fontSize: 11, textTransform: 'uppercase' as const }}>Medication</th>
                  <th style={{ background: '#7c3aed', color: 'white', padding: '8px 10px', textAlign: 'left' as const, fontSize: 11, textTransform: 'uppercase' as const }}>Dosage</th>
                  <th style={{ background: '#7c3aed', color: 'white', padding: '8px 10px', textAlign: 'left' as const, fontSize: 11, textTransform: 'uppercase' as const }}>Frequency</th>
                  <th style={{ background: '#7c3aed', color: 'white', padding: '8px 10px', textAlign: 'left' as const, fontSize: 11, textTransform: 'uppercase' as const }}>Duration</th>
                  <th style={{ background: '#7c3aed', color: 'white', padding: '8px 10px', textAlign: 'left' as const, fontSize: 11, textTransform: 'uppercase' as const, borderRadius: '0 6px 0 0' }}>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {prescribedMeds.map((med, i) => (
                  <tr key={med.id} style={{ background: i % 2 === 0 ? '#fff' : '#faf5ff' }}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' as const, fontWeight: 600, color: '#7c3aed' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>{med.name}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>{med.dosage}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>{med.frequency}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontSize: 13 }}>{med.duration}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontStyle: 'italic', color: '#666' }}>{med.instructions || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Notes */}
            {prescribedNotes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase' as const, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Additional Notes</p>
                <p style={{ fontSize: 13, color: '#78350f', margin: 0 }}>{prescribedNotes}</p>
              </div>
            )}

            {/* Signature */}
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Total Medications: <strong>{prescribedMeds.length}</strong></p>
              <div style={{ borderTop: '1px solid #333', width: 200, paddingTop: 6, textAlign: 'center' as const }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Dr. {user?.name || 'Doctor'}</div>
                <div style={{ fontSize: 11, color: '#666' }}>Prescribing Physician</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 12, fontSize: 10, color: '#999', display: 'flex', justifyContent: 'space-between' }}>
              <span>This is a computer-generated prescription.</span>
              <span>Generated: {new Date().toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={handlePrintPrescription}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Prescription
            </button>
            <button
              onClick={handleDownloadPrescription}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleCloseSummary}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Prescribe Medication</h3>
            <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add Medication Form */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-purple-900 mb-3">Add Medication</h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Medication Name - Search Engine Style */}
              <div className="col-span-2 relative" ref={searchContainerRef}>
                <label className="block text-xs text-purple-700 mb-1">Medication Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentMed(prev => ({ ...prev, name: e.target.value }));
                      setSelectedMed(null);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    placeholder="Type medication name (e.g., Dolo 650, Amoxicillin, Pantoprazole...)"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
                  )}
                </div>

                {/* Search Suggestions */}
                {showSuggestions && searchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-purple-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
                    {isSearching && suggestions.length === 0 ? (
                      <div className="flex items-center justify-center p-4 text-sm text-purple-500">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching Indian medicines database...
                      </div>
                    ) : (
                      <>
                        {/* "Use as typed" option - always available so doctor can type any name */}
                        <div
                          onClick={handleUseTypedName}
                          className={`px-3 py-2.5 cursor-pointer text-sm border-b border-purple-100 transition-colors flex items-center gap-2 ${
                            highlightIndex === -1 && !selectedMed ? 'bg-purple-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <Search className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                          <span className="text-gray-700">
                            Use: <strong className="text-purple-700">&ldquo;{searchQuery.trim()}&rdquo;</strong>
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">Enter</span>
                        </div>

                        {suggestions.length > 0 && (
                          <ul ref={listRef} className="overflow-y-auto max-h-56">
                            {suggestions.map((med: MedicationOption, index: number) => (
                              <li
                                key={`${med.id}-${index}`}
                                onClick={() => handleSelectMedication(med)}
                                className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors ${
                                  highlightIndex === index
                                    ? 'bg-purple-100'
                                    : selectedMed?.id === med.id
                                      ? 'bg-purple-50'
                                      : 'hover:bg-purple-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-gray-900">{med.name}</span>
                                    {med.genericName && med.genericName !== med.name && (
                                      <span className="text-gray-500 ml-1.5 text-xs">({med.genericName})</span>
                                    )}
                                  </div>
                                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                    {med.form}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">{med.category}</span>
                                  {med.manufacturer && (
                                    <span className="text-xs text-gray-400">| {med.manufacturer}</span>
                                  )}
                                  {med.strengths && med.strengths.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                      | {med.strengths.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}

                        {isSearching && suggestions.length > 0 && (
                          <div className="px-3 py-1.5 text-xs text-purple-500 bg-purple-50/50 border-t flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Searching for more results...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Helper text */}
                <p className="text-xs text-purple-400 mt-1">
                  Type to search Indian medicines, brand names, or generics. You can also type any custom medication name.
                </p>
              </div>

              <div>
                <label className="block text-xs text-purple-700 mb-1">Dosage</label>
                <input
                  type="text"
                  value={currentMed.dosage}
                  onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="e.g., 1 tablet, 5ml"
                />
              </div>
              <div>
                <label className="block text-xs text-purple-700 mb-1">Frequency</label>
                <select
                  value={currentMed.frequency}
                  onChange={(e) => setCurrentMed({ ...currentMed, frequency: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-purple-700 mb-1">Duration</label>
                <select
                  value={currentMed.duration}
                  onChange={(e) => setCurrentMed({ ...currentMed, duration: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {durations.map(dur => (
                    <option key={dur} value={dur}>{dur}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-purple-700 mb-1">Special Instructions</label>
                <input
                  type="text"
                  value={currentMed.instructions}
                  onChange={(e) => setCurrentMed({ ...currentMed, instructions: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="e.g., After meals"
                />
              </div>
            </div>
            <button
              onClick={handleAddMedication}
              disabled={!currentMed.name || !currentMed.dosage}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add to Prescription
            </button>
          </div>

          {/* Medications List */}
          {medications.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Prescribed Medications ({medications.length})</h4>
              {medications.map((med, index) => (
                <div key={med.id} className="bg-muted/30 border rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium text-foreground">{med.name}</span>
                    </div>
                    <div className="ml-8 mt-1 text-sm text-muted-foreground">
                      {med.dosage} &bull; {med.frequency} &bull; {med.duration}
                      {med.instructions && <span className="block text-xs italic mt-0.5">{med.instructions}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMedication(med.id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drug Interaction Warnings */}
          {addedMedOptions.length >= 2 && (() => {
            const warnings = checkInteractions(addedMedOptions);
            return warnings.length > 0 ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-yellow-800">Drug Interaction Alert</span>
                </div>
                <ul className="space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-xs text-yellow-800 flex items-start gap-1.5">
                      <span className="mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-700 mt-2 font-medium">
                  Please verify before prescribing. Clinical judgement applies.
                </p>
              </div>
            ) : null;
          })()}

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              placeholder="Any additional instructions or notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Prescribed by: {user?.name}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={medications.length === 0 || createPrescriptionMutation.isPending}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createPrescriptionMutation.isPending ? 'Prescribing...' : 'Create Prescription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

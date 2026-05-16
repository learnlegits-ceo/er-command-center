import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, Camera, User, Video, AlertTriangle, Shield, Phone, Loader2, Building2, Stethoscope, Bed, SwitchCamera, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreatePatient } from '@/hooks/usePatients';
import { useDepartments, useDepartmentDoctors } from '@/hooks/useDepartments';
import { useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';

// Convert a base64 data URL to a File object for upload
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mime });
}

// Department name → URL slug (must mirror Dashboard.tsx unitToDepartment / Layout.tsx)
const departmentNameToPath: Record<string, string> = {
  'Emergency Department - Unit A': '/emergency/unit-a',
  'Emergency Department - Unit B': '/emergency/unit-b',
  'Emergency Care Unit': '/emergency/care-unit',
  'Trauma Center': '/emergency/trauma',
  'Intensive Care Unit': '/emergency/icu',
  'General Ward': '/emergency/general-ward',
  'Pediatrics': '/emergency/pediatrics',
  'Cardiology': '/opd/cardiology',
  'Outpatient Department': '/opd/general',
};

// Vital sign range validators (clinical bounds)
const VITAL_RANGES = {
  hr: { min: 20, max: 300, label: 'Heart Rate', unit: 'bpm' },
  spo2: { min: 50, max: 100, label: 'SpO₂', unit: '%' },
  temp: { min: 30, max: 45, label: 'Temperature', unit: '°C' },
  rr: { min: 4, max: 80, label: 'Respiratory Rate', unit: '/min' },
};

interface NewArrivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentName?: string;
}

export function NewArrivalModal({ open, onOpenChange, defaultDepartmentName }: NewArrivalModalProps) {
  const navigate = useNavigate();
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vitalsScan, setVitalsScan] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const vitalsScanInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const startCamera = async (facing: 'user' | 'environment') => {
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing }
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch {
      alert('Camera access denied or not available.');
    }
  };

  const flipCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'M',
    bloodGroup: '',
    phone: '+91 ',
    complaint: '',
    vitals: {
      hr: '',
      bp: '',
      spo2: '',
      temp: '',
      rr: ''
    }
  });
  const [isPoliceCase, setIsPoliceCase] = useState(false);
  const [policeCaseType, setPoliceCaseType] = useState('');
  const [policeAlertPending, setPoliceAlertPending] = useState(false);
  const [policeAlertError, setPoliceAlertError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  const createPatient = useCreatePatient();
  const queryClient = useQueryClient();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();

  // Pre-select department based on current page — always sync when modal opens
  useEffect(() => {
    if (departments && defaultDepartmentName) {
      const matchingDept = departments.find(
        (d) => d.name === defaultDepartmentName || d.code === defaultDepartmentName
      );
      if (matchingDept) {
        setSelectedDepartment(matchingDept.id);
      }
    }
  }, [departments, defaultDepartmentName]);
  const { data: doctors, isLoading: doctorsLoading } = useDepartmentDoctors(selectedDepartment || null);

  if (!open) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPatientPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVitalsScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setVitalsScan(reader.result as string);
    reader.readAsDataURL(file);

    setOcrLoading(true);
    try {
      const response = await endpoints.patients.ocrVitals(file);
      if (response.data?.success && response.data?.data?.extracted) {
        const extracted = response.data.data.extracted;
        setFormData((prev) => ({
          ...prev,
          vitals: {
            hr: extracted.hr || prev.vitals.hr,
            bp: extracted.bp || prev.vitals.bp,
            spo2: extracted.spo2 || prev.vitals.spo2,
            temp: extracted.temp || prev.vitals.temp,
            rr: extracted.rr || prev.vitals.rr,
          }
        }));
      } else {
        alert('OCR could not extract vitals. Please enter manually.');
      }
    } catch {
      alert('OCR extraction failed. Please enter vitals manually.');
    } finally {
      setOcrLoading(false);
      // Clear the file input so the same file can be re-selected
      if (vitalsScanInputRef.current) vitalsScanInputRef.current.value = '';
    }
  };

  // Validate all required fields and vitals ranges — returns true if valid
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) errors.name = 'Patient name is required';
    else if (trimmedName.length < 2) errors.name = 'Name must be at least 2 characters';

    const parsedAge = parseInt(formData.age);
    if (!formData.age) errors.age = 'Age is required';
    else if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      errors.age = 'Age must be a whole number between 0 and 150';
    }

    if (!formData.complaint.trim()) errors.complaint = 'Chief complaint is required';

    if (!selectedDepartment) errors.department = 'Department is required';

    // Phone (optional, but if entered must be 10 digits)
    const phoneDigits = formData.phone.replace(/^\+91\s*/, '').replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    // Vitals (optional, but if entered must be in valid range)
    const { hr, bp, spo2, temp, rr } = formData.vitals;
    if (hr) {
      const v = parseInt(hr);
      if (isNaN(v) || v < VITAL_RANGES.hr.min || v > VITAL_RANGES.hr.max) {
        errors.vitalsHr = `Heart Rate must be ${VITAL_RANGES.hr.min}–${VITAL_RANGES.hr.max} bpm`;
      }
    }
    if (spo2) {
      const v = parseFloat(spo2);
      if (isNaN(v) || v < VITAL_RANGES.spo2.min || v > VITAL_RANGES.spo2.max) {
        errors.vitalsSpo2 = `SpO₂ must be ${VITAL_RANGES.spo2.min}–${VITAL_RANGES.spo2.max}%`;
      }
    }
    if (temp) {
      const v = parseFloat(temp);
      if (isNaN(v) || v < VITAL_RANGES.temp.min || v > VITAL_RANGES.temp.max) {
        errors.vitalsTemp = `Temperature must be ${VITAL_RANGES.temp.min}–${VITAL_RANGES.temp.max}°C`;
      }
    }
    if (rr) {
      const v = parseInt(rr);
      if (isNaN(v) || v < VITAL_RANGES.rr.min || v > VITAL_RANGES.rr.max) {
        errors.vitalsRr = `Respiratory Rate must be ${VITAL_RANGES.rr.min}–${VITAL_RANGES.rr.max} /min`;
      }
    }
    if (bp) {
      const parts = bp.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        errors.vitalsBp = 'Blood pressure must be systolic/diastolic (e.g., 120/80)';
      } else {
        const sys = parseInt(parts[0]);
        const dia = parseInt(parts[1]);
        if (isNaN(sys) || isNaN(dia)) errors.vitalsBp = 'BP values must be numbers';
        else if (sys < 40 || sys > 300) errors.vitalsBp = 'Systolic BP must be 40–300 mmHg';
        else if (dia < 20 || dia > 200) errors.vitalsBp = 'Diastolic BP must be 20–200 mmHg';
        else if (dia >= sys) errors.vitalsBp = 'Diastolic BP must be less than systolic';
      }
    }

    if (isPoliceCase && !policeCaseType) {
      errors.policeCaseType = 'Case type is required for police/MLC cases';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!validateForm()) {
      setSubmitError('Please fix the highlighted errors before submitting.');
      // Scroll to first error
      setTimeout(() => {
        const firstError = document.querySelector('[data-field-error="true"]');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    try {
      const trimmedName = formData.name.trim();
      const parsedAge = parseInt(formData.age);

      const patientData: any = {
        name: trimmedName,
        age: parsedAge,
        gender: formData.gender,
        blood_group: formData.bloodGroup || undefined,
        phone: formData.phone || undefined,
        complaint: formData.complaint.trim(),
        is_police_case: isPoliceCase,
        police_case_type: policeCaseType || undefined,
        department_id: selectedDepartment || undefined,
        assigned_doctor_id: selectedDoctor || undefined,
        auto_assign_bed: true,
        vitals: formData.vitals.hr || formData.vitals.bp || formData.vitals.spo2 || formData.vitals.temp || formData.vitals.rr ? {
          hr: formData.vitals.hr || undefined,
          bp: formData.vitals.bp || undefined,
          spo2: formData.vitals.spo2 || undefined,
          temp: formData.vitals.temp || undefined,
          rr: formData.vitals.rr || undefined,
        } : undefined,
      };

      const result = await createPatient.mutateAsync(patientData);
      const createdPatientId = result?.data?.id;

      // Upload photo if one was captured or selected
      if (photoFile && createdPatientId) {
        try {
          await endpoints.patients.uploadPhoto(createdPatientId, photoFile);
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        } catch (photoError) {
          console.error('Failed to upload photo:', photoError);
        }
      }

      // Create police case alert if flagged
      if (isPoliceCase && policeAlertPending && createdPatientId && policeCaseType) {
        try {
          await endpoints.policeCases.create({
            patient_id: createdPatientId,
            patient_name: formData.name,
            case_type: policeCaseType,
            description: `Police/Legal case - ${policeCaseType.replace(/_/g, ' ')}`,
            complaint: formData.complaint || undefined,
          });
        } catch (policeError) {
          console.error('Failed to create police case alert:', policeError);
        }
      }

      // Resolve the selected department name → URL slug; navigate if different from current page
      const selectedDeptObj = departments?.find((d) => d.id === selectedDepartment);
      const selectedDeptName = selectedDeptObj?.name;
      const targetPath = selectedDeptName ? departmentNameToPath[selectedDeptName] : undefined;
      const onDifferentDept = selectedDeptName && defaultDepartmentName && selectedDeptName !== defaultDepartmentName;

      // Reset form and close modal
      setFormData({
        name: '',
        age: '',
        gender: 'M',
        bloodGroup: '',
        phone: '+91 ',
        complaint: '',
        vitals: { hr: '', bp: '', spo2: '', temp: '', rr: '' }
      });
      setPatientPhoto(null);
      setPhotoFile(null);
      setVitalsScan(null);
      setIsPoliceCase(false);
      setPoliceCaseType('');
      setPoliceAlertPending(false);
      setPoliceAlertError('');
      setSelectedDepartment('');
      setSelectedDoctor('');
      setFieldErrors({});
      onOpenChange(false);

      // Navigate to the department the patient was registered into, so the user sees them
      if (onDifferentDept && targetPath) {
        navigate(targetPath);
      }
    } catch (error: any) {
      console.error('Failed to register patient:', error);
      const detail = error?.response?.data?.detail;
      setSubmitError(typeof detail === 'string' ? detail : 'Failed to register patient. Please try again.');
    }
  };

  // Reusable error helper component
  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p data-field-error="true" className="text-xs text-red-600 mt-1">{msg}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">New ER Arrival</h2>
              <p className="text-sm text-muted-foreground">Register new patient for AI triage</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content — reordered: required text fields first, then department/doctor, then vitals, then optional photo/police */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Submit-level error banner */}
          {submitError && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* === REQUIRED PATIENT DETAILS (above the fold) === */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s\-'.]/g, '');
                    setFormData({ ...formData, name: val });
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                  }}
                  className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    fieldErrors.name ? 'border-red-500' : 'border-input'
                  }`}
                  placeholder="Enter full name"
                />
                <ErrorMsg msg={fieldErrors.name} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  step="1"
                  value={formData.age}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, age: val });
                    if (fieldErrors.age) setFieldErrors({ ...fieldErrors, age: '' });
                  }}
                  className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    fieldErrors.age ? 'border-red-500' : 'border-input'
                  }`}
                  placeholder="e.g., 45"
                />
                <ErrorMsg msg={fieldErrors.age} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-2 bg-muted border border-r-0 border-input rounded-l-lg text-sm text-muted-foreground font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={formData.phone.replace(/^\+91\s*/, '')}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: `+91 ${digits}` });
                      if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      fieldErrors.phone ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="98765 43210"
                    maxLength={10}
                  />
                </div>
                <ErrorMsg msg={fieldErrors.phone} />
              </div>
            </div>

            {/* Chief Complaint — moved above the fold (required) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Chief Complaint / Symptoms <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.complaint}
                onChange={(e) => {
                  setFormData({ ...formData, complaint: e.target.value });
                  if (fieldErrors.complaint) setFieldErrors({ ...fieldErrors, complaint: '' });
                }}
                rows={3}
                className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                  fieldErrors.complaint ? 'border-red-500' : 'border-input'
                }`}
                placeholder="Describe symptoms and reason for visit"
              />
              <ErrorMsg msg={fieldErrors.complaint} />
            </div>

            {/* Department and Doctor Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedDoctor('');
                    if (fieldErrors.department) setFieldErrors({ ...fieldErrors, department: '' });
                  }}
                  className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    fieldErrors.department ? 'border-red-500' : 'border-input'
                  }`}
                  disabled={departmentsLoading}
                >
                  <option value="">Select department...</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <ErrorMsg msg={fieldErrors.department} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Stethoscope className="w-4 h-4 inline mr-1" />
                  Assign Doctor
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!selectedDepartment || doctorsLoading}
                >
                  <option value="">Auto-assign (recommended)</option>
                  {doctors?.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}{doctor.specialization ? ` - ${doctor.specialization}` : ''}
                    </option>
                  ))}
                </select>
                {/* Show contextual hint based on actual state — fixes residual hint bug */}
                {!selectedDepartment ? (
                  <p className="text-xs text-muted-foreground mt-1">Select a department first</p>
                ) : doctorsLoading ? (
                  <p className="text-xs text-muted-foreground mt-1">Loading doctors…</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-assign based on workload</p>
                )}
              </div>
            </div>

            {/* Bed auto-assigned info */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Bed className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700">A bed will be automatically assigned from the selected department</p>
            </div>

            {/* === VITALS (with validation) === */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground">
                  Initial Vitals (Optional)
                </label>
                <div>
                  <input
                    type="file"
                    ref={vitalsScanInputRef}
                    accept="image/*"
                    onChange={handleVitalsScanUpload}
                    className="hidden"
                    id="vitals-scan-upload"
                  />
                  <label
                    htmlFor="vitals-scan-upload"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200 ${ocrLoading ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {ocrLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        OCR Scan Vitals
                      </>
                    )}
                  </label>
                </div>
              </div>

              {vitalsScan && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <img src={vitalsScan} alt="Vitals scan" className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-blue-900 mb-1">Vitals extracted via OCR</p>
                      <p className="text-xs text-blue-700">Values have been automatically filled below — please verify</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">HR (bpm)</label>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    step="1"
                    value={formData.vitals.hr}
                    onChange={(e) => {
                      setFormData({ ...formData, vitals: { ...formData.vitals, hr: e.target.value } });
                      if (fieldErrors.vitalsHr) setFieldErrors({ ...fieldErrors, vitalsHr: '' });
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${
                      fieldErrors.vitalsHr ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="72"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={formData.vitals.bp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9/]/g, '');
                      setFormData({ ...formData, vitals: { ...formData.vitals, bp: val } });
                      if (fieldErrors.vitalsBp) setFieldErrors({ ...fieldErrors, vitalsBp: '' });
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${
                      fieldErrors.vitalsBp ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">SpO₂ (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    step="1"
                    value={formData.vitals.spo2}
                    onChange={(e) => {
                      setFormData({ ...formData, vitals: { ...formData.vitals, spo2: e.target.value } });
                      if (fieldErrors.vitalsSpo2) setFieldErrors({ ...fieldErrors, vitalsSpo2: '' });
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${
                      fieldErrors.vitalsSpo2 ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="98"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    min="30"
                    max="45"
                    step="0.1"
                    value={formData.vitals.temp}
                    onChange={(e) => {
                      setFormData({ ...formData, vitals: { ...formData.vitals, temp: e.target.value } });
                      if (fieldErrors.vitalsTemp) setFieldErrors({ ...fieldErrors, vitalsTemp: '' });
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${
                      fieldErrors.vitalsTemp ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="36.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">RR (/min)</label>
                  <input
                    type="number"
                    min="4"
                    max="80"
                    step="1"
                    value={formData.vitals.rr}
                    onChange={(e) => {
                      setFormData({ ...formData, vitals: { ...formData.vitals, rr: e.target.value } });
                      if (fieldErrors.vitalsRr) setFieldErrors({ ...fieldErrors, vitalsRr: '' });
                    }}
                    className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${
                      fieldErrors.vitalsRr ? 'border-red-500' : 'border-input'
                    }`}
                    placeholder="16"
                  />
                </div>
              </div>
              {/* Inline error display for vitals — show first failing one */}
              {(fieldErrors.vitalsHr || fieldErrors.vitalsBp || fieldErrors.vitalsSpo2 || fieldErrors.vitalsTemp || fieldErrors.vitalsRr) && (
                <div className="mt-2 space-y-0.5">
                  <ErrorMsg msg={fieldErrors.vitalsHr} />
                  <ErrorMsg msg={fieldErrors.vitalsBp} />
                  <ErrorMsg msg={fieldErrors.vitalsSpo2} />
                  <ErrorMsg msg={fieldErrors.vitalsTemp} />
                  <ErrorMsg msg={fieldErrors.vitalsRr} />
                </div>
              )}
            </div>

            {/* === OPTIONAL: Patient Photo === */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Patient Photo (Optional)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden relative">
                  {showCamera ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : patientPhoto ? (
                    <img src={patientPhoto} alt="Patient" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    ref={photoInputRef}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </label>
                    {!showCamera ? (
                      <button
                        type="button"
                        onClick={() => startCamera(facingMode)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        <Video className="w-4 h-4" />
                        Take Photo
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current && stream) {
                              const canvas = document.createElement('canvas');
                              canvas.width = videoRef.current.videoWidth;
                              canvas.height = videoRef.current.videoHeight;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(videoRef.current, 0, 0);
                                const dataUrl = canvas.toDataURL('image/jpeg');
                                setPatientPhoto(dataUrl);
                                setPhotoFile(dataURLtoFile(dataUrl, `patient-photo-${Date.now()}.jpg`));
                              }
                              stream.getTracks().forEach(track => track.stop());
                              setStream(null);
                              setShowCamera(false);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                        >
                          <Camera className="w-4 h-4" />
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={flipCamera}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                          title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
                        >
                          <SwitchCamera className="w-4 h-4" />
                          Flip
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* === OPTIONAL: Police/Emergency Case === */}
            <div className={`p-4 rounded-lg border-2 transition-colors ${isPoliceCase ? 'border-red-300 bg-red-50' : 'border-border bg-muted/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${isPoliceCase ? 'text-red-600' : 'text-muted-foreground'}`} />
                  <label className="text-sm font-medium text-foreground">
                    Police / Legal Case
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPoliceCase(!isPoliceCase);
                    if (isPoliceCase) {
                      setPoliceCaseType('');
                      setPoliceAlertPending(false);
                      setPoliceAlertError('');
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isPoliceCase ? 'bg-red-500' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isPoliceCase ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {isPoliceCase && (
                <div className="space-y-3">
                  <p className="text-xs text-red-700">
                    Mark this case if it involves an accident, assault, or any situation requiring police notification.
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-red-800 mb-1">
                      Case Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={policeCaseType}
                      onChange={(e) => {
                        setPoliceCaseType(e.target.value);
                        if (fieldErrors.policeCaseType) setFieldErrors({ ...fieldErrors, policeCaseType: '' });
                      }}
                      className={`w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm ${
                        fieldErrors.policeCaseType ? 'border-red-500' : 'border-red-200'
                      }`}
                    >
                      <option value="">Select case type...</option>
                      <option value="road_accident">Road Traffic Accident</option>
                      <option value="assault">Assault / Violence</option>
                      <option value="domestic_violence">Domestic Violence</option>
                      <option value="sexual_assault">Sexual Assault</option>
                      <option value="workplace_accident">Workplace Accident</option>
                      <option value="burn_injury">Burn Injury (Suspicious)</option>
                      <option value="poisoning">Poisoning (Suspicious)</option>
                      <option value="unknown_identity">Unknown Identity / Unconscious</option>
                      <option value="brought_dead">Brought Dead</option>
                      <option value="other">Other Police Matter</option>
                    </select>
                    <ErrorMsg msg={fieldErrors.policeCaseType} />
                  </div>

                  {policeCaseType && !policeAlertPending && (
                    <button
                      type="button"
                      onClick={() => {
                        setPoliceAlertPending(true);
                        setPoliceAlertError('');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      Alert Admin for Police Notification
                    </button>
                  )}

                  {policeAlertPending && (
                    <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg">
                      <Phone className="w-4 h-4 text-green-700" />
                      <span className="text-sm text-green-800 font-medium">
                        Police alert will be sent to Admin when patient is registered.
                      </span>
                    </div>
                  )}

                  {policeAlertError && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-700" />
                      <span className="text-sm text-red-800 font-medium">
                        {policeAlertError}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={() => {
            const hasData = formData.name || formData.age || formData.complaint;
            if (hasData && !window.confirm('You have unsaved data. Are you sure you want to close?')) return;
            onOpenChange(false);
          }} disabled={createPatient.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={createPatient.isPending}
          >
            {createPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createPatient.isPending ? 'Registering...' : 'Run AI Triage'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, User, Video, AlertTriangle, Shield, Phone, Loader2, Building2, Stethoscope, Bed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreatePatient } from '@/hooks/usePatients';
import { useDepartments, useDepartmentDoctors, useDepartmentBeds } from '@/hooks/useDepartments';
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

interface NewArrivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentName?: string;
}

export function NewArrivalModal({ open, onOpenChange, defaultDepartmentName }: NewArrivalModalProps) {
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vitalsScan, setVitalsScan] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'M',
    bloodGroup: '',
    phone: '',
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
  const [selectedBed, setSelectedBed] = useState('');
  const [autoAssignBed, setAutoAssignBed] = useState(true);

  const createPatient = useCreatePatient();
  const queryClient = useQueryClient();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();

  // Pre-select department based on current page
  useEffect(() => {
    if (departments && defaultDepartmentName && !selectedDepartment) {
      const matchingDept = departments.find(
        (d) => d.name === defaultDepartmentName || d.code === defaultDepartmentName
      );
      if (matchingDept) {
        setSelectedDepartment(matchingDept.id);
      }
    }
  }, [departments, defaultDepartmentName, selectedDepartment]);
  const { data: doctors, isLoading: doctorsLoading } = useDepartmentDoctors(selectedDepartment || null);
  const { data: beds, isLoading: bedsLoading } = useDepartmentBeds(selectedDepartment || null, 'available');

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

  const handleVitalsScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVitalsScan(reader.result as string);
        // Simulate OCR extraction - in real app, call OCR API here
        setFormData({
          ...formData,
          vitals: {
            hr: '112',
            bp: '165/95',
            spo2: '91',
            temp: '37.2',
            rr: '18'
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      // Prepare patient data for API (backend expects string values for vitals)
      const patientData: any = {
        name: formData.name,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        blood_group: formData.bloodGroup || undefined,
        phone: formData.phone || undefined,
        complaint: formData.complaint,
        is_police_case: isPoliceCase,
        police_case_type: policeCaseType || undefined,
        department_id: selectedDepartment || undefined,
        assigned_doctor_id: selectedDoctor || undefined,
        bed_id: selectedBed || undefined,
        auto_assign_bed: autoAssignBed,
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
          // Re-invalidate patients query so the queue shows the photo
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

      // Reset form and close modal
      setFormData({
        name: '',
        age: '',
        gender: 'M',
        bloodGroup: '',
        phone: '',
        complaint: '',
        vitals: {
          hr: '',
          bp: '',
          spo2: '',
          temp: '',
          rr: ''
        }
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
      setSelectedBed('');
      setAutoAssignBed(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to register patient:', error);
    }
  };

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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Patient Photo */}
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
                        onClick={async () => {
                          try {
                            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
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
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                      >
                        <Video className="w-4 h-4" />
                        Take Photo
                      </button>
                    ) : (
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
                              // Convert to File for backend upload
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
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Patient Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 45M or 32F"
                />
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
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Chief Complaint / Symptoms <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.complaint}
                onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Describe symptoms and reason for visit"
              />
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
                    setSelectedDoctor(''); // Reset doctor when department changes
                  }}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={departmentsLoading}
                >
                  <option value="">Select department...</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
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
                <p className="text-xs text-muted-foreground mt-1">
                  {!selectedDepartment
                    ? 'Select a department first'
                    : 'Leave empty to auto-assign based on workload'}
                </p>
              </div>
            </div>

            {/* Bed Assignment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">
                  <Bed className="w-4 h-4 inline mr-1" />
                  Bed Assignment
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoAssignBed}
                    onChange={(e) => {
                      setAutoAssignBed(e.target.checked);
                      if (e.target.checked) setSelectedBed('');
                    }}
                    className="w-4 h-4 rounded border-input"
                  />
                  Auto-assign
                </label>
              </div>
              {!autoAssignBed && (
                <select
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!selectedDepartment || bedsLoading}
                >
                  <option value="">Select a bed...</option>
                  {beds?.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.bedNumber} {bed.bedType ? `(${bed.bedType})` : ''} {bed.wing ? `- ${bed.wing}` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground">
                {autoAssignBed
                  ? 'A bed will be automatically assigned from the selected department'
                  : !selectedDepartment
                    ? 'Select a department first'
                    : beds?.length === 0
                      ? 'No available beds in this department'
                      : `${beds?.length} beds available`}
              </p>
            </div>

            {/* Police/Emergency Case */}
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
                      onChange={(e) => setPoliceCaseType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
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

            {/* Vitals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground">
                  Initial Vitals (Optional)
                </label>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVitalsScanUpload}
                    className="hidden"
                    id="vitals-scan-upload"
                  />
                  <label
                    htmlFor="vitals-scan-upload"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    OCR Scan Vitals
                  </label>
                </div>
              </div>

              {vitalsScan && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <img src={vitalsScan} alt="Vitals scan" className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-blue-900 mb-1">Vitals extracted via OCR</p>
                      <p className="text-xs text-blue-700">Values have been automatically filled below</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">HR (bpm)</label>
                  <input
                    type="text"
                    value={formData.vitals.hr}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, hr: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="72"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    value={formData.vitals.bp}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, bp: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">SpO₂ (%)</label>
                  <input
                    type="text"
                    value={formData.vitals.spo2}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, spo2: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="98"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Temp (°C)</label>
                  <input
                    type="text"
                    value={formData.vitals.temp}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, temp: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="36.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">RR (/min)</label>
                  <input
                    type="text"
                    value={formData.vitals.rr}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, rr: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="16"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createPatient.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={createPatient.isPending || !formData.name || !formData.complaint || !selectedDepartment}
          >
            {createPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createPatient.isPending ? 'Registering...' : 'Run AI Triage'}
          </Button>
        </div>
      </div>
    </div>
  );
}

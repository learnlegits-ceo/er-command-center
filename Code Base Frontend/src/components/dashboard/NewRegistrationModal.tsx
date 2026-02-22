import { useState, useRef } from 'react';
import { X, Upload, Camera, User, Loader2, Brain, CheckCircle2, AlertTriangle, Clock, ChevronRight, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreatePatient } from '@/hooks/usePatients';
import { useDepartments } from '@/hooks/useDepartments';
import { endpoints } from '@/lib/api';

interface NewRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentName?: string;
}

interface TriageResult {
  reasoning: string;
  recommendations: string[];
  confidence: number;
  estimatedWaitTime: string;
  priority: number;
  priorityLabel: string;
  priorityColor: string;
  patientName: string;
  patientId: string;
}

export function NewRegistrationModal({ open, onOpenChange, defaultDepartmentName }: NewRegistrationModalProps) {
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vitalsScan, setVitalsScan] = useState<string | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    bloodGroup: '',
    phone: '',
    purpose: '',
    vitals: {
      hr: '',
      bp: '',
      spo2: '',
      temp: '',
      rr: ''
    }
  });

  const createPatient = useCreatePatient();
  const { data: departments } = useDepartments();

  // Find the matching department ID from the department name
  const departmentId = defaultDepartmentName && departments
    ? departments.find(
        (d) => d.name.toLowerCase().includes(defaultDepartmentName.toLowerCase()) ||
               d.code?.toLowerCase().includes(defaultDepartmentName.toLowerCase())
      )?.id
    : undefined;

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
            hr: '88',
            bp: '125/80',
            spo2: '97',
            temp: '98.6',
            rr: '16'
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
        phone: formData.phone,
        blood_group: formData.bloodGroup || undefined,
        complaint: formData.purpose,
        department_id: departmentId || undefined,
        vitals: formData.vitals.hr || formData.vitals.bp ? {
          hr: formData.vitals.hr || undefined,
          bp: formData.vitals.bp || undefined,
          spo2: formData.vitals.spo2 || undefined,
          temp: formData.vitals.temp || undefined,
          respiratory_rate: formData.vitals.rr || undefined,
        } : undefined,
      };

      const result = await createPatient.mutateAsync(patientData);
      const createdPatientId = result?.data?.id;

      // Upload photo if one was selected
      if (photoFile && createdPatientId) {
        try {
          await endpoints.patients.uploadPhoto(createdPatientId, photoFile);
        } catch (photoError) {
          console.error('Failed to upload photo:', photoError);
        }
      }

      // Capture triage result for display
      if (result?.data?.triage) {
        setTriageResult({
          reasoning: result.data.triage.reasoning || '',
          recommendations: result.data.triage.recommendations || [],
          confidence: result.data.triage.confidence || 0,
          estimatedWaitTime: result.data.triage.estimatedWaitTime || '',
          priority: result.data.priority || 0,
          priorityLabel: result.data.priorityLabel || '',
          priorityColor: result.data.priorityColor || '',
          patientName: result.data.name || formData.name,
          patientId: result.data.patientId || '',
        });
      } else {
        // No triage data - just close
        resetAndClose();
      }
    } catch (error) {
      console.error('Failed to register patient:', error);
    }
  };

  const resetAndClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
    }
    setFormData({
      name: '',
      age: '',
      gender: 'male',
      bloodGroup: '',
      phone: '',
      purpose: '',
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
    setTriageResult(null);
    onOpenChange(false);
  };

  // If triage result is available, show the result screen
  if (triageResult) {
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
    const getPriorityIcon = (priority: number) => {
      if (priority <= 2) return <AlertTriangle className="w-5 h-5" />;
      return <CheckCircle2 className="w-5 h-5" />;
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card rounded-lg shadow-xl w-full max-w-lg mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Patient Registered Successfully</h2>
                <p className="text-sm text-muted-foreground">{triageResult.patientName} - {triageResult.patientId}</p>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* AI Triage Result */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-foreground">AI Triage Assessment</h3>
            </div>

            {/* Priority Badge */}
            <div className={`p-4 rounded-lg border ${getPriorityBgColor(triageResult.priority)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={getPriorityTextColor(triageResult.priority)}>
                    {getPriorityIcon(triageResult.priority)}
                  </span>
                  <div>
                    <p className={`font-semibold ${getPriorityTextColor(triageResult.priority)}`}>
                      {triageResult.priorityLabel || `Level ${triageResult.priority}`}
                    </p>
                    {triageResult.confidence > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Confidence: {Math.round(triageResult.confidence * 100)}%
                      </p>
                    )}
                  </div>
                </div>
                {triageResult.estimatedWaitTime && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Est. wait: {triageResult.estimatedWaitTime}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reasoning */}
            {triageResult.reasoning && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Reasoning</p>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  {triageResult.reasoning}
                </p>
              </div>
            )}

            {/* Recommendations */}
            {triageResult.recommendations && triageResult.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Recommendations</p>
                <ul className="space-y-1">
                  {triageResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t bg-muted/30">
            <Button onClick={resetAndClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-semibold text-foreground">New OPD Registration</h2>
              <p className="text-sm text-muted-foreground">Register new outpatient</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
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
                    id="opd-photo-upload"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <label
                      htmlFor="opd-photo-upload"
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
                              // Convert to File for upload
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  setPhotoFile(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }));
                                }
                              }, 'image/jpeg');
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
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
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
                  Phone Number <span className="text-red-500">*</span>
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

            {/* Purpose of Visit */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Purpose of Visit <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Describe reason for OPD visit"
              />
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
                  <label className="block text-xs text-muted-foreground mb-1">Heart Rate</label>
                  <input
                    type="text"
                    value={formData.vitals.hr}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, hr: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="bpm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Blood Pressure</label>
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
                  <label className="block text-xs text-muted-foreground mb-1">SpO₂</label>
                  <input
                    type="text"
                    value={formData.vitals.spo2}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, spo2: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="%"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Temperature</label>
                  <input
                    type="text"
                    value={formData.vitals.temp}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, temp: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="°C"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Resp. Rate</label>
                  <input
                    type="text"
                    value={formData.vitals.rr}
                    onChange={(e) => setFormData({
                      ...formData,
                      vitals: { ...formData.vitals, rr: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="bpm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={createPatient.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={createPatient.isPending || !formData.name || !formData.age || !formData.phone || !formData.purpose}
          >
            {createPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createPatient.isPending ? 'Registering...' : 'Register Patient'}
          </Button>
        </div>
      </div>
    </div>
  );
}

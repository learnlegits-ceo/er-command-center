import { useState, useEffect } from 'react';
import { X, Save, User, Stethoscope, Bed as BedIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDepartments, useDepartmentDoctors, useDepartmentBeds, Department, Doctor, Bed } from '@/hooks/useDepartments';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';

interface EditPatientModalProps {
  patient: {
    id: string;
    name: string;
    age: string;
    gender: string;
    complaint: string;
    assignedDoctor: string;
    bed?: string;
    bedId?: string;
    uhi: string;
    phone?: string;
    bloodGroup?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPatientModal({ patient, open, onOpenChange }: EditPatientModalProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    complaint: '',
    phone: '',
    bloodGroup: '',
    department_id: '',
    assigned_doctor_id: '',
    bed_id: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch departments
  const { data: departments, isLoading: loadingDepartments } = useDepartments();

  // Fetch doctors when department is selected
  const { data: doctors, isLoading: loadingDoctors } = useDepartmentDoctors(formData.department_id || null);

  // Fetch available beds when department is selected
  const { data: beds, isLoading: loadingBeds } = useDepartmentBeds(formData.department_id || null, 'available');

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return endpoints.patients.update(patient!.id, data);
    },
    onSuccess: async () => {
      // Patient edit may trigger re-triage on backend, refresh all relevant data
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-triage-timeline', patient!.id] }),
      ]);
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to update patient');
    }
  });

  // Reset form when patient changes
  useEffect(() => {
    if (patient) {
      setFormData({
        complaint: patient.complaint || '',
        phone: patient.phone || '',
        bloodGroup: patient.bloodGroup || '',
        department_id: '',
        assigned_doctor_id: '',
        bed_id: patient.bedId || '',
      });
      setError(null);
    }
  }, [patient]);

  if (!open || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const updateData: any = {};

    if (formData.complaint && formData.complaint !== patient.complaint) {
      updateData.complaint = formData.complaint;
    }
    if (formData.phone && formData.phone !== (patient.phone || '')) {
      updateData.phone = formData.phone;
    }
    if (formData.bloodGroup !== (patient.bloodGroup || '')) {
      updateData.blood_group = formData.bloodGroup;
    }
    if (formData.assigned_doctor_id) {
      updateData.assigned_doctor_id = formData.assigned_doctor_id;
    }
    if (formData.bed_id && formData.bed_id !== patient.bedId) {
      updateData.bed_id = formData.bed_id;
    }

    if (Object.keys(updateData).length === 0) {
      setError('No changes to save');
      return;
    }

    updateMutation.mutate(updateData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Edit Patient</h2>
            <p className="text-sm text-muted-foreground">{patient.name} • {patient.uhi}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Chief Complaint */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Chief Complaint
            </label>
            <textarea
              value={formData.complaint}
              onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              placeholder="Patient's chief complaint"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Patient's phone number"
            />
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Blood Group
            </label>
            <select
              value={formData.bloodGroup}
              onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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

          {/* Department Selection (for changing doctor/bed) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Department (for doctor/bed change)
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({
                ...formData,
                department_id: e.target.value,
                assigned_doctor_id: '',
                bed_id: ''
              })}
              className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Select department to change assignment</option>
              {loadingDepartments ? (
                <option disabled>Loading...</option>
              ) : (
                departments?.map((dept: Department) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Doctor Selection */}
          {formData.department_id && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Reassign Doctor
              </label>
              <select
                value={formData.assigned_doctor_id}
                onChange={(e) => setFormData({ ...formData, assigned_doctor_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Keep current: {patient.assignedDoctor}</option>
                {loadingDoctors ? (
                  <option disabled>Loading doctors...</option>
                ) : doctors?.length === 0 ? (
                  <option disabled>No doctors available</option>
                ) : (
                  doctors?.map((doctor: Doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Bed Selection */}
          {formData.department_id && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <BedIcon className="w-4 h-4 inline mr-1" />
                Reassign Bed
              </label>
              <select
                value={formData.bed_id}
                onChange={(e) => setFormData({ ...formData, bed_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Keep current: {patient.bed || 'No bed'}</option>
                {loadingBeds ? (
                  <option disabled>Loading beds...</option>
                ) : beds?.length === 0 ? (
                  <option disabled>No beds available</option>
                ) : (
                  beds?.map((bed: Bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.bedNumber} {bed.bedType ? `(${bed.bedType})` : ''} - {bed.wing || 'Main'}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Current Info Display */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Current Assignment</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-blue-600" />
                <span>{patient.assignedDoctor}</span>
              </div>
              <div className="flex items-center gap-1">
                <BedIcon className="w-3 h-3 text-green-600" />
                <span>{patient.bed || 'No bed'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

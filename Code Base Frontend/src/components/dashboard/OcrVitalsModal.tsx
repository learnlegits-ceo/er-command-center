import { useState } from 'react';
import { X, Camera, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OcrVitalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OcrVitalsModal({ open, onOpenChange }: OcrVitalsModalProps) {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    // Trigger camera input
    document.getElementById('camera-input')?.click();
  };

  const handleUploadFile = () => {
    // Trigger file input
    document.getElementById('file-input')?.click();
  };

  const handleProcess = () => {
    console.log('Processing OCR for:', fileName);
    // Add your OCR processing logic here
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">OCR Vitals Capture</h2>
              <p className="text-sm text-muted-foreground">Upload vitals monitor or handwritten sheet</p>
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
            {/* Description */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Upload a photo of the vitals monitor display or handwritten nursing notes.
                Our AI will automatically extract and validate the vitals data.
              </p>
            </div>

            {/* Upload Options */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleCameraCapture}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Take Photo</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Use device camera
                </p>
              </button>

              <button
                onClick={handleUploadFile}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <Upload className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Upload File</h3>
                <p className="text-xs text-muted-foreground text-center">
                  JPG, PNG, PDF
                </p>
              </button>
            </div>

            {/* Hidden inputs */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
              id="camera-input"
            />
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-input"
            />

            {/* Preview */}
            {uploadedFile && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{fileName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setFileName('');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                </div>
                <div className="p-4 max-h-64 overflow-hidden flex items-center justify-center bg-muted/10">
                  {fileName.toLowerCase().endsWith('.pdf') ? (
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">PDF Document</p>
                    </div>
                  ) : (
                    <img
                      src={uploadedFile}
                      alt="Uploaded vitals"
                      className="max-h-60 object-contain"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Supported formats */}
            <div className="bg-muted/30 border rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Supported Formats</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Vitals monitor displays (Philips, GE, Mindray, etc.)</li>
                <li>• ECG strips and printouts</li>
                <li>• Handwritten nursing notes and charts</li>
                <li>• Medication administration records (MAR)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!uploadedFile}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Camera className="mr-2 h-4 w-4" />
            Process OCR
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { File } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const MiniTLDR: React.FC = () => {
  const [content, setContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        alert('Please upload a valid file type: PDF, DOCX, or TXT');
        return;
      }
      
      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit 
        alert('File size must be under 20MB. Please upload a smaller file.');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        alert('Please upload a valid file type: PDF, DOCX, or TXT');
        return;
      }
      
      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit 
        alert('File size must be under 20MB. Please upload a smaller file.');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSubmit = () => {
    if (file) {
      // Create a new FormData instance
      const formData = new FormData();
      formData.append('file', file);

      // Store the FormData in sessionStorage (more secure than localStorage)
      sessionStorage.setItem('tldrTempFormData', JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      }));

      // Store the actual file in a global variable
      window.__tldrTempFile = file;

      navigate('/summarize?type=file&autoStart=true');
    } else if (content) {
      navigate(`/summarize?content=${encodeURIComponent(content)}&autoStart=true`);
    } else {
      navigate('/summarize');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 px-4">
      <Card className="p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
            placeholder="Paste your text here..."
          />
          <div 
            className={`border-4 border-dashed rounded-2xl p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="mini-file-upload"
              onChange={handleFileChange}
              className="hidden"
              accept=".txt,.pdf,.doc,.docx"
            />
            <label
              htmlFor="mini-file-upload"
              className="cursor-pointer block"
            >
              <div className="flex flex-col items-center justify-center">
                <File size={32} className={`mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                <p className={`text-lg font-medium ${isDragOver ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {file ? file.name : (isDragOver ? 'Drop file here!' : 'Drop file or click to upload')}
                </p>
              </div>
            </label>
          </div>
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full"
            onClick={handleSubmit}
          >
            TLDRit!
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Add the global type declaration
declare global {
  interface Window {
    __tldrTempFile?: File;
  }
}

export default MiniTLDR;

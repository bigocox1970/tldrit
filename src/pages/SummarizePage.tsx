import React from 'react';
import { useLocation } from 'react-router-dom';
import SummarizeForm from '../components/summarize/SummarizeForm';

const SummarizePage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialContent = searchParams.get('content') || '';
  const autoStart = searchParams.get('autoStart') === 'true';
  const fileType = searchParams.get('type') === 'file';

  return (
    <div className="relative">
      <SummarizeForm 
        initialContent={initialContent} 
        autoStart={autoStart}
        fileType={fileType}
      />
    </div>
  );
}

export default SummarizePage;

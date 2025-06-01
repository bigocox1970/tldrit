import React from 'react';
import { useLocation } from 'react-router-dom';
import SummarizeForm from '../components/summarize/SummarizeForm';

const SummarizePage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialContent = searchParams.get('content') || '';

  return (
    <div className="relative">
      <SummarizeForm initialContent={initialContent} />
    </div>
  );
}

export default SummarizePage;
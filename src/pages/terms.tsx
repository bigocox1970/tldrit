import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const TermsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Close terms and conditions"
      >
        <X size={24} />
      </button>

      <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using TLDRit, you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          TLDRit provides AI-powered text summarization and text-to-speech services. The service processes user-provided content to generate concise summaries and audio versions of text content.
        </p>

        <h2>3. User Obligations</h2>
        <p>
          Users agree to:
        </p>
        <ul>
          <li>Provide accurate account information</li>
          <li>Maintain the security of their account</li>
          <li>Use the service in compliance with all applicable laws</li>
          <li>Not attempt to circumvent any service limitations or restrictions</li>
        </ul>

        <h2 id="fair-use-policy">4. Fair Use Policy</h2>
        <p>
          While our Premium plan offers "Unlimited" TLDRs and text-to-speech conversions, this is subject to our fair use policy. This policy exists to ensure the sustainability of our service and fair access for all users.
        </p>
        <h3>Why We Have a Fair Use Policy</h3>
        <p>
          TLDRit relies on advanced AI models and APIs to provide our summarization and text-to-speech services. These underlying services have associated costs that scale with usage. To maintain our affordable pricing while providing high-quality service to all users, we need to ensure that individual usage remains within reasonable bounds.
        </p>
        <h3>Policy Details</h3>
        <ul>
          <li>Premium plan usage is monitored on a monthly basis</li>
          <li>API calls are capped when they exceed the equivalent of £10 in API costs for the current month</li>
          <li>This cap helps us prevent potential abuse while ensuring fair access for all users</li>
          <li>The vast majority of users {'(>99%)'} never reach this limit</li>
        </ul>
        <h3>High-Volume Usage</h3>
        <p>
          If you consistently require higher volumes, please contact our support team to discuss enterprise pricing options that better suit your needs.
        </p>

        <h2>5. Privacy and Data Protection</h2>
        <p>
          We are committed to protecting your privacy. All data processing is conducted in accordance with our Privacy Policy and applicable data protection laws.
        </p>

        <h2>6. Service Modifications</h2>
        <p>
          We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.
        </p>

        <h2>7. Termination</h2>
        <p>
          We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          TLDRit shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to update these terms at any time. We will notify users of any material changes via email or through the service.
        </p>

        <h2>10. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at support@tldrit.app
        </p>
      </div>
    </div>
  );
};

export default TermsPage; 
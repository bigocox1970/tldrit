import React from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PWAInstallGuide: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Install TLDRit Web App</h2>

          <div className="space-y-8">
            {/* Chrome on Android */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Chrome on Android</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Tap the menu button (three dots) in Chrome</li>
                <li>Select "Install app" or "Add to Home screen"</li>
                <li>Follow the prompts to install</li>
              </ol>
            </section>

            {/* Safari on iOS */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Safari on iOS</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Tap the share button (square with arrow) at the bottom of Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right corner</li>
              </ol>
            </section>

            {/* Chrome on Desktop */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Chrome on Desktop</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the install icon in the address bar (computer with down arrow)</li>
                <li>Click "Install" in the prompt</li>
                <li>The app will open in its own window</li>
              </ol>
            </section>

            {/* Edge on Desktop */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Edge on Desktop</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                <li>Click the menu button (three dots) in Edge</li>
                <li>Select "Apps" {'>'} "Install this site as an app"</li>
                <li>Click "Install" in the prompt</li>
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallGuide; 
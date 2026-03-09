"use client";

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export const ShareInfo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-gray-600"
        title="How to share"
      >
        <HelpCircle size={18} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">How to Share</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>1. <strong>Code Editor:</strong> Click the Share button to generate a link</p>
              <p>2. <strong>Whiteboard:</strong> Use the Share button to share drawings</p>
              <p>3. <strong>Copy the link</strong> and send it to others</p>
              <p>4. <strong>Recipients</strong> can view your code and drawings</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

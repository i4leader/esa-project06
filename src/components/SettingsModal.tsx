import React, { useState, useEffect } from 'react';
import { ApiCredentials } from '../types';
import { useApiConfig } from '../hooks/useApiConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { credentials, saveCredentials, testConnection, isValid, isLoading, error } = useApiConfig();
  
  const [formData, setFormData] = useState<ApiCredentials>({
    nlsToken: '',
    dashScopeKey: ''
  });
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState({
    nlsToken: false,
    dashScopeKey: false
  });

  // Load existing credentials when modal opens
  useEffect(() => {
    if (isOpen && credentials) {
      setFormData(credentials);
    }
  }, [isOpen, credentials]);

  // Reset test status when form data changes
  useEffect(() => {
    setTestStatus('idle');
  }, [formData]);

  const handleInputChange = (field: keyof ApiCredentials, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.nlsToken.trim() || !formData.dashScopeKey.trim()) {
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    
    try {
      // Save credentials first
      await saveCredentials(formData);
      
      // Test connection
      const result = await testConnection();
      setTestStatus(result ? 'success' : 'error');
    } catch (err) {
      setTestStatus('error');
    }
  };

  const handleSave = async () => {
    if (!formData.nlsToken.trim() || !formData.dashScopeKey.trim()) {
      return;
    }

    try {
      await saveCredentials(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save credentials:', err);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">API Configuration</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* NLS Token Input */}
            <div>
              <label htmlFor="nlsToken" className="block text-sm font-medium text-gray-700 mb-2">
                ✓ NLS Token:
              </label>
              <div className="relative">
                <input
                  id="nlsToken"
                  type={showPassword.nlsToken ? 'text' : 'password'}
                  value={formData.nlsToken}
                  onChange={(e) => handleInputChange('nlsToken', e.target.value)}
                  placeholder="Paste your NLS token here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('nlsToken')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword.nlsToken ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* DashScope API Key Input */}
            <div>
              <label htmlFor="dashScopeKey" className="block text-sm font-medium text-gray-700 mb-2">
                ✓ DashScope API Key:
              </label>
              <div className="relative">
                <input
                  id="dashScopeKey"
                  type={showPassword.dashScopeKey ? 'text' : 'password'}
                  value={formData.dashScopeKey}
                  onChange={(e) => handleInputChange('dashScopeKey', e.target.value)}
                  placeholder="Paste your DashScope API key here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('dashScopeKey')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword.dashScopeKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={isLoading || testStatus === 'testing' || !formData.nlsToken.trim() || !formData.dashScopeKey.trim()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testStatus === 'testing' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </span>
                ) : (
                  '🧪 Test Connection'
                )}
              </button>
              
              <button
                onClick={handleSave}
                disabled={!formData.nlsToken.trim() || !formData.dashScopeKey.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ✅ Save
              </button>
              
              <button
                onClick={onClose}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                ❌ Close
              </button>
            </div>

            {/* Status Display */}
            <div className="pt-2">
              {testStatus === 'testing' && (
                <div className="text-blue-600 text-sm flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Status: ⏳ Testing connection...
                </div>
              )}
              
              {testStatus === 'success' && (
                <div className="text-green-600 text-sm">
                  Status: ✅ Connection successful!
                </div>
              )}
              
              {testStatus === 'error' && (
                <div className="text-red-600 text-sm">
                  Status: ❌ Connection failed. Please check your credentials.
                </div>
              )}
              
              {error && testStatus !== 'testing' && (
                <div className="text-red-600 text-sm mt-1">
                  Error: {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
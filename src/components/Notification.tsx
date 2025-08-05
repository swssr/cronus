import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from '@phosphor-icons/react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Notification({ 
  message, 
  type, 
  onClose, 
  duration = 5000 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const icon = type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />;
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const iconColor = type === 'success' ? 'text-green-600' : 'text-red-600';

  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 border rounded-lg shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${bgColor}`}
    >
      <div className="flex items-center gap-3">
        <div className={iconColor}>
          {icon}
        </div>
        <div className={`flex-1 ${textColor}`}>
          {message}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className={`p-1 rounded hover:bg-black/10 transition-colors ${textColor}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
} 
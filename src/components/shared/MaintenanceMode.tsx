import { Construction } from 'lucide-react';

interface MaintenanceModeProps {
  message: string;
}

export default function MaintenanceMode({ message }: MaintenanceModeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <Construction className="w-10 h-10 text-orange-600" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Karbantartás alatt
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 mb-8 whitespace-pre-wrap">
            {message}
          </p>

          {/* Footer */}
          <div className="text-sm text-gray-500">
            <p>Köszönjük a türelmedet!</p>
            <p className="mt-2">— A MatekHelp csapata</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Ha sürgős ügyben keresel minket, írj a következő címre:</p>
          <p className="mt-1 text-gray-600 font-medium">info@matekhelp.hu</p>
        </div>
      </div>
    </div>
  );
}

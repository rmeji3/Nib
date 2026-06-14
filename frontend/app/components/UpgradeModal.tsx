"use client";

import { X, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  title = "Upgrade to Pro", 
  message = "You've reached the limits of your current plan. Upgrade to Nib Pro to continue." 
}: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400 mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onClose();
              router.push("/settings/pricing");
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-medium rounded-lg hover:from-blue-400 hover:to-emerald-400 transition-colors"
          >
            View Pricing Plans
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

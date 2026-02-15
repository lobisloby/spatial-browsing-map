import React from 'react';
import { Coffee, Heart, Star, ExternalLink, MessageCircle, Github } from 'lucide-react';
import { Separator } from '../ui/Separator';

const COFFEE_URL = 'https://buymeacoffee.com/YOUR_USERNAME';
const GITHUB_URL = 'https://github.com/YOUR_USERNAME/spatial-browsing-map';

export const SupportPanel: React.FC = () => {
  const open = (url: string) => chrome.tabs.create({ url });

  return (
    <div className="p-4 space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Heart className="w-7 h-7 text-white" fill="white" />
        </div>
        <h3 className="text-base font-bold text-surface-800 dark:text-surface-200">Support This Project</h3>
        <p className="text-xs text-surface-500 mt-1">If this helps your workflow, consider supporting!</p>
      </div>

      <Separator />

      <button
        onClick={() => open(COFFEE_URL)}
        className="w-full group rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white hover:shadow-lg transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
          <div className="text-left flex-1">
            <div className="font-semibold text-sm">Buy Me a Coffee</div>
            <div className="text-xs text-white/80">One-time support</div>
          </div>
          <ExternalLink className="w-4 h-4 opacity-60" />
        </div>
      </button>

      <Separator />

      <div className="space-y-1.5">
        {[
          { icon: <Star className="w-4 h-4 text-amber-500" />, label: 'Rate on Chrome Store', url: '#' },
          { icon: <Github className="w-4 h-4 text-surface-500" />, label: 'Star on GitHub', url: GITHUB_URL },
          { icon: <MessageCircle className="w-4 h-4 text-brand-500" />, label: 'Send Feedback', url: `${GITHUB_URL}/issues` },
        ].map((item) => (
          <button key={item.label} onClick={() => open(item.url)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            {item.icon}
            <span className="text-sm text-surface-700 dark:text-surface-300 flex-1 text-left">{item.label}</span>
            <ExternalLink className="w-3.5 h-3.5 text-surface-400" />
          </button>
        ))}
      </div>

      <div className="text-center pt-2">
        <p className="text-2xs text-surface-400">Spatial Browsing Map v1.0.0</p>
        <p className="text-2xs text-surface-500 mt-0.5">Made with AyoubCoder for researchers</p>
      </div>
    </div>
  );
};
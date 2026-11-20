import { useLayoutEffect } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import usePlanningAppearance from '../hooks/usePlanningAppearance';

let palette;
export function AppearanceController() {
  const { appearance } = usePlanningAppearance();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = appearance;
    let active = true;
    let printing = false;
    const apply = () => {
      if (active && !printing && appearance === 'dark') {
        palette?.enable({ darkSchemeBackgroundColor:'#151c26', darkSchemeTextColor:'#edf1f6' }, {
          ignoreInlineStyle:['.studio-stage svg *', '.sheet-layout svg *'],
          ignoreImageAnalysis:['.public-hero-photo img'],
        });
      }
    };
    if (appearance === 'dark') {
      if (palette) apply();
      else import('darkreader').then(module => { palette = module; apply(); }).catch(() => {
        if (active) root.dataset.theme = 'light';
      });
    }
    const beforePrint = () => { printing = true; palette?.disable(); };
    const afterPrint = () => { printing = false; apply(); };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      active = false;
      palette?.disable();
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [appearance]);
  return null;
}

export default function AppearanceChoice() {
  const { choice, choose } = usePlanningAppearance();
  const Icon = choice === 'system' ? ComputerDesktopIcon : choice === 'dark' ? MoonIcon : SunIcon;
  return <label className="appearance-choice" title="Appearance">
    <Icon aria-hidden="true" />
    <select aria-label="Appearance" value={choice} onChange={event => choose(event.target.value)}>
      <option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>
  </label>;
}

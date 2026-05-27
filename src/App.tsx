import OverlayView from './components/OverlayView';
import SettingsView from './components/SettingsView';
import SplashView from './components/SplashView';


export default function App() {
  // Direct, lightweight Electron window routing
  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view');

  const isSettings =
    view === 'settings' ||
    window.location.hash === '#settings' ||
    window.location.hash === '#/settings';

  const isSplash = view === 'splash';

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent select-none">
      {isSplash ? <SplashView /> : isSettings ? <SettingsView /> : <OverlayView />}
    </div>
  );
}



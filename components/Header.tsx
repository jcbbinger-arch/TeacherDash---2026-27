import React from 'react';
import { ChefHatIcon } from './icons';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { signOut, user, syncStatus, triggerManualSync } = useAppContext();
  const [isIframe, setIsIframe] = React.useState(false);

  React.useEffect(() => {
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-semibold animate-pulse border border-blue-100 dark:border-blue-800">
            <svg className="animate-spin h-3.5 w-3.5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Sincronizando...</span>
          </div>
        );
      case 'synced':
        return (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-100 dark:border-emerald-800 shadow-sm" title="Todos tus datos están guardados de forma segura en la base de datos de la nube.">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Nube Conectada</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-rose-100 dark:border-rose-800 animate-bounce" title="Hubo un problema al conectar con la base de datos remota. Se mantendrán tus datos offline.">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Error de Sincronización</span>
          </div>
        );
      case 'offline':
      default:
        return (
          <div className="flex items-center space-x-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700" title="Inicia sesión con Google para sincronizar tus datos en la base de datos remota.">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            <span>Modo Local</span>
          </div>
        );
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
            <ChefHatIcon className="h-8 w-8 text-blue-500 mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Módulo: Productos Culinarios
            </h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
            {getSyncBadge()}
            {user && (
                <button
                    onClick={() => triggerManualSync(true)}
                    disabled={syncStatus === 'syncing'}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                        syncStatus === 'syncing' 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60'
                    }`}
                    title="Forzar actualización y descarga de datos desde la nube"
                >
                    <svg className={`h-3.5 w-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.214 15M12 3v9l4 2" />
                    </svg>
                    <span>Resincronizar</span>
                </button>
            )}
            {user && (
                <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                    {user.photoURL ? (
                        <img referrerPolicy="no-referrer" src={user.photoURL} alt="Perfil" className="w-5 h-5 rounded-full ring-1 ring-slate-200" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                            {user.email ? user.email[0].toUpperCase() : 'U'}
                        </div>
                    )}
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 leading-none truncate max-w-[120px]">
                            {user.displayName || 'Profesor'}
                        </span>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-none truncate max-w-[120px]" title={user.email || ''}>
                            {user.email}
                        </span>
                    </div>
                </div>
            )}
            {user && (
                <button 
                    onClick={signOut}
                    className="bg-gray-100 text-gray-700 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition text-xs font-medium"
                >
                    Cerrar sesión
                </button>
            )}
            {isIframe && (
                <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-900 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-amber-100 transition shadow-sm"
                    title="Si tienes problemas de sincronización en Safari o Incógnito, abre la aplicación en pestaña nueva para evitar que el navegador restrinja la base de datos."
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Nueva Pestaña 🌐</span>
                </a>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
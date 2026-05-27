import React from 'react';
import { ChefHatIcon } from './icons';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { signOut, user, syncStatus } = useAppContext();

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
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
            <ChefHatIcon className="h-8 w-8 text-blue-500 mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Módulo: Productos Culinarios
            </h1>
        </div>
        <div className="flex items-center space-x-4">
            {getSyncBadge()}
            {user && (
                <button 
                    onClick={signOut}
                    className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm"
                >
                    Cerrar sesión
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
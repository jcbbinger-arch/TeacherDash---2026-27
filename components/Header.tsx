import React from 'react';
import { ChefHatIcon } from './icons';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { signOut, user } = useAppContext();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
            <ChefHatIcon className="h-8 w-8 text-blue-500 mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Módulo: Productos Culinarios
            </h1>
        </div>
        {user && (
            <button 
                onClick={signOut}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition text-sm"
            >
                Cerrar sesión
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;
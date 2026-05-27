import React from 'react';
import { useAppContext } from '../context/AppContext';

const LoginPage: React.FC = () => {
    const { signIn } = useAppContext();

    const handleSignIn = async () => {
        console.log("Iniciando login con Google...");
        try {
            await signIn();
            console.log("Login exitoso");
        } catch (error) {
            console.error("Error en login:", error);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <h1 className="text-2xl font-bold mb-4">Bienvenido al Gestor de Estudiantes</h1>
                <p className="mb-6 text-gray-600">Inicia sesión con tu cuenta de Google para continuar.</p>
                <button 
                    onClick={handleSignIn}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
                >
                    Iniciar sesión con Google
                </button>
            </div>
        </div>
    );
};

export default LoginPage;

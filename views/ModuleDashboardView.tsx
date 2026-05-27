import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import StatCard from '../components/StatCard';
import ActionCard from '../components/ActionCard';
import { FileTextIcon, BookOpenIcon, PencilIcon, ClipboardListIcon } from '../components/icons';

interface ModuleDashboardViewProps {
    module: 'pc' | 'optativa' | 'proyecto';
    onNavigate: (view: string) => void;
}

const MODULE_NAMES: Record<string, string> = {
    pc: 'Productos Culinarios',
    optativa: 'Optativa',
    proyecto: 'Proyecto'
};

const ModuleDashboardView: React.FC<ModuleDashboardViewProps> = ({ module, onNavigate }) => {
    const context = useAppContext();

    const [
        resultadosAprendizaje,
        criteriosEvaluacion,
        instrumentosEvaluacion,
        unidadesTrabajo
    ] = useMemo(() => {
        if (module === 'optativa') return [
            context.optativaResultadosAprendizaje,
            context.optativaCriteriosEvaluacion,
            context.optativaInstrumentosEvaluacion,
            context.optativaUnidadesTrabajo,
        ];
        if (module === 'proyecto') return [
            context.proyectoResultadosAprendizaje,
            context.proyectoCriteriosEvaluacion,
            context.proyectoInstrumentosEvaluacion,
            context.proyectoUnidadesTrabajo,
        ];
        return [ // default PC
            context.pcResultadosAprendizaje,
            context.pcCriteriosEvaluacion,
            context.pcInstrumentosEvaluacion,
            context.pcUnidadesTrabajo,
        ];
    }, [module, context]);

    const stats = useMemo(() => ({
        numRAs: Object.keys(resultadosAprendizaje).length,
        numCriterios: Object.keys(criteriosEvaluacion).length,
        numUTs: Object.keys(unidadesTrabajo).length,
        numInstrumentos: Object.keys(instrumentosEvaluacion).length,
    }), [resultadosAprendizaje, criteriosEvaluacion, unidadesTrabajo, instrumentosEvaluacion]);

    const moduleName = MODULE_NAMES[module];

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Resumen del Módulo: {moduleName}</h1>
                <p className="text-gray-500 mt-1">Visión general de la configuración y progreso del módulo.</p>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={FileTextIcon} title="Resultados de Aprendizaje" value={stats.numRAs} color="#8b5cf6" />
                <StatCard icon={ClipboardListIcon} title="Criterios de Evaluación" value={stats.numCriterios} color="#3b82f6" />
                <StatCard icon={BookOpenIcon} title="Unidades de Trabajo" value={stats.numUTs} color="#10b981" />
                <StatCard icon={PencilIcon} title="Instrumentos" value={stats.numInstrumentos} color="#f59e0b" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Acciones del Módulo</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <ActionCard icon={FileTextIcon} title="Gestionar RAs y Criterios" description="Define los resultados de aprendizaje" onClick={() => onNavigate(`${module}-ra`)} color="#8b5cf6" />
                    <ActionCard icon={BookOpenIcon} title="Gestionar Unidades de Trabajo" description="Organiza las unidades didácticas" onClick={() => onNavigate(`${module}-ut`)} color="#10b981" />
                    <ActionCard icon={PencilIcon} title="Gestionar Instrumentos" description="Configura los instrumentos de evaluación" onClick={() => onNavigate(`${module}-instrumentos`)} color="#f59e0b" />
                </div>
            </div>
        </div>
    );
};

export default ModuleDashboardView;

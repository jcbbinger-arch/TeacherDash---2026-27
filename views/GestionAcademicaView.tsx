
import React, { useState, useMemo, useEffect } from 'react';
import { Student, CourseModuleGrades, GradeValue, StudentCalculatedGrades, InstrumentoEvaluacion } from '../types';
import { ACADEMIC_EVALUATION_STRUCTURE, COURSE_MODULES } from '../data/constants';
import { ClipboardListIcon, SaveIcon, ExportIcon, PencilIcon } from '../components/icons';
import { downloadPdfWithTables } from '../components/printUtils';
import { useAppContext } from '../context/AppContext';
import { calculateStudentPeriodAverages, calculateModularGrades } from '../services/gradeCalculator';

const EvaluacionInstrumentosTab: React.FC = () => {
    const { 
        students, 
        instrumentGrades, setInstrumentGrades,
        optativaInstrumentosEvaluacion,
        proyectoInstrumentosEvaluacion,
        addToast
    } = useAppContext();

    const [selectedModule, setSelectedModule] = useState<'optativa' | 'proyecto'>('optativa');
    const [localGrades, setLocalGrades] = useState(instrumentGrades);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLocalGrades(instrumentGrades);
        setIsDirty(false);
    }, [instrumentGrades]);

    useEffect(() => {
        // When module changes, check if there are unsaved changes
        if (isDirty) {
            if (window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y cambiar de módulo?')) {
                setLocalGrades(instrumentGrades);
                setIsDirty(false);
            } else {
                // Revert module selection
                setSelectedModule(prev => prev === 'optativa' ? 'proyecto' : 'optativa');
            }
        }
    }, [selectedModule]);


    const activities = useMemo(() => {
        const instruments = selectedModule === 'optativa' ? optativaInstrumentosEvaluacion : proyectoInstrumentosEvaluacion;
        const acts = Object.values(instruments as Record<string, InstrumentoEvaluacion>).flatMap(inst => 
            inst.activities.map(act => ({ ...act, instrumentName: inst.nombre }))
        );
        acts.sort((a,b) => {
            if (a.trimester < b.trimester) return -1;
            if (a.trimester > b.trimester) return 1;
            return a.name.localeCompare(b.name);
        });
        return acts;
    }, [selectedModule, optativaInstrumentosEvaluacion, proyectoInstrumentosEvaluacion]);

    const sortedStudents = useMemo(() => [...students].sort((a, b) => a.apellido1.localeCompare(b.apellido1)), [students]);

    const handleGradeChange = (studentId: string, activityId: string, value: string) => {
        const numericValue = value === '' ? null : parseFloat(value);
        if (value !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > 10)) return;

        setLocalGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            newGrades[studentId][activityId] = numericValue;
            return newGrades;
        });
        setIsDirty(true);
    };

    const handleSaveChanges = () => {
        setInstrumentGrades(localGrades);
        setIsDirty(false);
        addToast('Calificaciones guardadas con éxito.', 'success');
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                 <div className="flex items-center gap-4">
                    <label className="font-semibold">Seleccionar Módulo:</label>
                    <select value={selectedModule} onChange={e => setSelectedModule(e.target.value as 'optativa' | 'proyecto')} className="p-2 border rounded-md bg-white shadow-sm">
                        <option value="optativa">Optativa</option>
                        <option value="proyecto">Proyecto</option>
                    </select>
                 </div>
                 <button onClick={handleSaveChanges} disabled={!isDirty} className={`flex items-center px-4 py-2 rounded-lg font-semibold transition ${!isDirty ? 'bg-green-200 text-green-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                    <SaveIcon className="w-5 h-5 mr-1" /> Guardar Cambios
                </button>
            </div>
            
            <div className="overflow-x-auto">
                 {activities.length > 0 ? (
                    <table className="min-w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 border font-semibold text-gray-600 w-48 text-left sticky left-0 bg-gray-100">Alumno</th>
                                {activities.map(act => (
                                    <th key={act.id} className="p-2 border font-semibold text-gray-600" title={act.instrumentName}>
                                        {act.name} ({act.trimester.toUpperCase()})
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                             {sortedStudents.map((student, index) => (
                                <tr key={student.id} className={`group ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-yellow-50`}>
                                    <td className={`p-1 border text-left font-semibold text-gray-800 w-48 sticky left-0 group-hover:bg-yellow-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>{`${student.apellido1} ${student.apellido2}, ${student.nombre}`}</td>
                                    {activities.map(act => (
                                        <td key={act.id} className="border">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0" max="10"
                                                value={localGrades[student.id]?.[act.id] ?? ''}
                                                onChange={e => handleGradeChange(student.id, act.id, e.target.value)}
                                                className="w-20 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 ) : (
                     <div className="p-8 text-center text-gray-500">
                         No hay actividades de evaluación definidas para el módulo de {selectedModule}.
                         <br/>
                         Puedes añadirlas en la sección de 'Instrumentos' del módulo correspondiente.
                     </div>
                 )}
            </div>
        </div>
    );
}


const GestionAcademicaView: React.FC = () => {
    const { 
        students, 
        academicGrades, setAcademicGrades, 
        courseGrades, setCourseGrades, 
        calculatedStudentGrades, 
        instrumentGrades, 
        optativaInstrumentosEvaluacion,
        proyectoInstrumentosEvaluacion,
        teacherData, instituteData, addToast 
    } = useAppContext();
    
    const [activeTab, setActiveTab] = useState<'principal' | 'otros' | 'instrumentos'>('principal');
    const [localAcademicGrades, setLocalAcademicGrades] = useState(academicGrades);
    const [localCourseGrades, setLocalCourseGrades] = useState(courseGrades);
    const [isDirty, setIsDirty] = useState(false);
    
    useEffect(() => {
        setLocalAcademicGrades(JSON.parse(JSON.stringify(academicGrades)));
        setLocalCourseGrades(JSON.parse(JSON.stringify(courseGrades)));
        setIsDirty(false);
    }, [academicGrades, courseGrades]);

    const finalGradesAndAverages = useMemo(() => {
        const studentGroups = students.reduce((acc, student) => {
            (acc[student.grupo] = acc[student.grupo] || []).push(student);
            return acc;
        }, {} as Record<string, Student[]>);

        Object.keys(studentGroups).forEach(groupName => {
            studentGroups[groupName].sort((a,b) => a.apellido1.localeCompare(b.apellido1));
        });

        const studentGrades: Record<string, { averages: Record<string, number | null> }> = {};
        students.forEach(student => {
            studentGrades[student.id] = {
                averages: calculateStudentPeriodAverages(localAcademicGrades[student.id], calculatedStudentGrades[student.id])
            };
        });
        
        return { studentGroups, studentGrades };
    }, [students, localAcademicGrades, calculatedStudentGrades]);

    const handleManualGradeChange = (studentId: string, periodKey: string, instrumentKey: string, value: string) => {
        const numericValue = value === '' ? null : parseFloat(value);
        if (value !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > 10)) return;

        setLocalAcademicGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            if (!newGrades[studentId][periodKey]) newGrades[studentId][periodKey] = { manualGrades: {} };
            newGrades[studentId][periodKey].manualGrades[instrumentKey] = numericValue;
            return newGrades;
        });
        setIsDirty(true);
    };

    const handleCourseGradeChange = (studentId: string, moduleName: string, period: keyof CourseModuleGrades, value: string) => {
        const numericValue = value === '' ? null : parseFloat(value);
         if (value !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > 10)) return;
        
        setLocalCourseGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            if (!newGrades[studentId][moduleName]) newGrades[studentId][moduleName] = {};
            newGrades[studentId][moduleName][period] = numericValue;
            return newGrades;
        });
        setIsDirty(true);
    };

    const handleToggleConvalidation = (studentId: string, moduleName: string) => {
        setLocalCourseGrades(prev => {
            const newGrades = JSON.parse(JSON.stringify(prev));
            if (!newGrades[studentId]) newGrades[studentId] = {};
            if (!newGrades[studentId][moduleName]) newGrades[studentId][moduleName] = {};

            const currentStatus = newGrades[studentId][moduleName].isConvalidated || false;
            newGrades[studentId][moduleName].isConvalidated = !currentStatus;

            if (!currentStatus) { // Si se está convalidando, limpiar notas
                newGrades[studentId][moduleName].t1 = null;
                newGrades[studentId][moduleName].t2 = null;
                newGrades[studentId][moduleName].t3 = null;
                newGrades[studentId][moduleName].rec = null;
            }

            return newGrades;
        });
        setIsDirty(true);
    };

    const handleSaveChanges = () => {
        if (activeTab === 'principal' || activeTab === 'otros') {
            setAcademicGrades(localAcademicGrades);
            setCourseGrades(localCourseGrades);
            setIsDirty(false);
            addToast('Calificaciones guardadas con éxito.', 'success');
        }
        // Save for 'instrumentos' tab is handled within its component
    };

    return (
    <div>
        <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    <ClipboardListIcon className="w-8 h-8 mr-3 text-purple-500" />
                    Gestión Académica
                </h1>
                <p className="text-gray-500 mt-1">Introduce y visualiza todas las calificaciones del curso.</p>
            </div>
            {(activeTab === 'principal' || activeTab === 'otros') && (
                <div className="flex items-center space-x-2">
                    <button onClick={handleSaveChanges} disabled={!isDirty} className={`flex items-center px-4 py-2 rounded-lg font-semibold transition ${!isDirty ? 'bg-green-200 text-green-500 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                        <SaveIcon className="w-5 h-5 mr-1" /> Guardar Cambios
                    </button>
                </div>
            )}
        </header>

        <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-2">
                 <button onClick={() => setActiveTab('principal')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'principal' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>Módulo Principal (PC)</button>
                 <button onClick={() => setActiveTab('instrumentos')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'instrumentos' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}><PencilIcon className="w-4 h-4 mr-2 inline-block"/>Evaluación por Instrumentos</button>
                 <button onClick={() => setActiveTab('otros')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'otros' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>Otros Módulos</button>
            </nav>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {activeTab === 'principal' && (
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-center border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-2 border font-semibold text-gray-600 w-48 text-left sticky left-0 bg-gray-100" rowSpan={2}>Alumno</th>
                            {ACADEMIC_EVALUATION_STRUCTURE.periods.map(period => (<th key={period.key} className="p-2 border font-semibold text-gray-600" colSpan={period.instruments.length + 1}>{period.name}</th>))}
                        </tr>
                        <tr>
                            {ACADEMIC_EVALUATION_STRUCTURE.periods.flatMap(period => [
                                ...period.instruments.map(instrument => (<th key={`${period.key}-${instrument.key}`} className={`p-2 border font-semibold text-gray-500 text-[10px] ${instrument.type === 'calculated' ? 'bg-blue-50' : ''}`}>{instrument.name} ({instrument.weight * 100}%)</th>)),
                                <th key={`${period.key}-avg`} className="p-2 border font-bold text-gray-700 bg-gray-200">MEDIA</th>
                            ])}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(finalGradesAndAverages.studentGroups).map(([groupName, studentsInGroup]: [string, Student[]]) => (
                            <React.Fragment key={groupName}>
                                <tr><td colSpan={100} className="bg-gray-200 font-bold p-1 text-left pl-4">{groupName}</td></tr>
                                {studentsInGroup.map((student, index) => (
                                    <tr key={student.id} className={`group hover:bg-yellow-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <td className={`p-1 border text-left font-semibold text-gray-800 w-48 sticky left-0 group-hover:bg-yellow-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>{`${student.apellido1} ${student.apellido2}, ${student.nombre}`}</td>
                                        {ACADEMIC_EVALUATION_STRUCTURE.periods.flatMap(period => {
                                            const studentAverage = finalGradesAndAverages.studentGrades[student.id].averages[period.key];
                                            return [
                                                ...period.instruments.map(instrument => {
                                                    let calculatedGrade: number | null = null;
                                                    if (instrument.type === 'calculated') {
                                                        if (instrument.key === 'servicios') {
                                                            const periodKey = period.key as 't1' | 't2' | 't3';
                                                            calculatedGrade = calculatedStudentGrades[student.id]?.serviceAverages[periodKey] ?? null;
                                                        } else {
                                                            const examKeyMap: Record<string, keyof StudentCalculatedGrades['practicalExams']> = {
                                                                'exPracticoT1': 't1',
                                                                'exPracticoT2': 't2',
                                                                'exPracticoT3': 't3',
                                                                'exPracticoRec': 'rec',
                                                            };
                                                            const examKey = examKeyMap[instrument.key];
                                                            if (examKey) {
                                                                calculatedGrade = calculatedStudentGrades[student.id]?.practicalExams[examKey] ?? null;
                                                            }
                                                        }
                                                    }
                                                    return (
                                                    <td key={`${period.key}-${instrument.key}`} className={`border ${instrument.type === 'calculated' ? 'bg-blue-50' : ''}`}>
                                                    {instrument.type === 'manual' ? (
                                                        <input type="number" step="0.1" min="0" max="10" value={localAcademicGrades[student.id]?.[period.key]?.manualGrades?.[instrument.key] ?? ''} onChange={e => handleManualGradeChange(student.id, period.key, instrument.key, e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none"/>
                                                    ) : (<span className="p-1.5 block">{calculatedGrade !== null ? calculatedGrade.toFixed(2) : '-'}</span>)}
                                                    </td>
                                                )}),
                                                <td key={`${period.key}-avg`} className={`p-1.5 border font-bold ${studentAverage !== null && studentAverage < 5 ? 'text-red-600' : 'text-black'} bg-gray-200`}>{studentAverage?.toFixed(2) ?? '-'}</td>
                                            ]
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {activeTab === 'instrumentos' && (
            <EvaluacionInstrumentosTab />
        )}
        {activeTab === 'otros' && (
             <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-center">
                     <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border font-semibold text-gray-600 text-left">Alumno</th>
                            {COURSE_MODULES.map(module => <th key={module.name} colSpan={module.trimesters + 3} className="p-2 border font-semibold text-gray-600">{module.name}</th>)}
                        </tr>
                         <tr>
                            <th className="p-2 border font-semibold text-gray-600 text-left"></th>
                            {COURSE_MODULES.flatMap(module => [
                                <th key={`${module.name}-t1`} className="p-2 border font-semibold text-gray-500 text-[10px]">T1</th>,
                                <th key={`${module.name}-t2`} className="p-2 border font-semibold text-gray-500 text-[10px]">T2</th>,
                                ...(module.trimesters === 3 ? [<th key={`${module.name}-t3`} className="p-2 border font-semibold text-gray-500 text-[10px]">T3</th>] : []),
                                <th key={`${module.name}-rec`} className="p-2 border font-semibold text-gray-500 text-[10px]">REC</th>,
                                <th key={`${module.name}-final`} className="p-2 border font-bold text-gray-700 bg-gray-200">FINAL</th>,
                                <th key={`${module.name}-action`} className="p-2 border font-semibold text-gray-500 text-[10px]">Acción</th>,
                            ])}
                        </tr>
                    </thead>
                    <tbody>
                         {students.map((student, index) => (
                            <tr key={student.id} className={`group ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-yellow-50`}>
                                <td className={`p-1 border text-left font-semibold text-gray-800 sticky left-0 group-hover:bg-yellow-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>{`${student.apellido1} ${student.apellido2}, ${student.nombre}`}</td>
                                {COURSE_MODULES.map(module => {
                                    const studentCourseGrades = localCourseGrades[student.id] || {};
                                    const isConvalidated = studentCourseGrades[module.name]?.isConvalidated;
                                    
                                    let gradesObj: { t1: number | null, t2: number | null, t3: number | null, final: number | null };
                                    let calculated = false;

                                    if (module.name === 'Optativa') {
                                        gradesObj = calculateModularGrades(student.id, instrumentGrades, optativaInstrumentosEvaluacion);
                                        calculated = true;
                                    } else if (module.name === 'Proyecto') {
                                        gradesObj = calculateModularGrades(student.id, instrumentGrades, proyectoInstrumentosEvaluacion);
                                        calculated = true;
                                    } else {
                                        const stored = studentCourseGrades[module.name] || {};
                                        const valid = [stored.t1, stored.t2, module.trimesters === 3 ? stored.t3 : null].filter(g => g !== null && g !== undefined) as number[];
                                        gradesObj = {
                                            t1: stored.t1 ?? null,
                                            t2: stored.t2 ?? null,
                                            t3: stored.t3 ?? null,
                                            final: valid.length > 0 ? (valid.reduce((a,b) => a+b, 0) / valid.length) : null
                                        };
                                    }

                                    const recVal = studentCourseGrades[module.name]?.rec ?? null; 

                                    return (
                                        <React.Fragment key={module.name}>
                                            {isConvalidated ? (
                                                <>
                                                    <td colSpan={module.trimesters + 2} className="border text-center font-bold text-green-600 bg-green-50">CONVALIDADA</td>
                                                    <td className="border text-center"><button onClick={() => handleToggleConvalidation(student.id, module.name)} className="text-xs text-gray-500 hover:text-red-600 p-1">Anular</button></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`border ${calculated ? 'bg-gray-100' : ''}`}>
                                                        {calculated ? 
                                                            <span className="p-1.5 block text-center font-medium text-gray-700">{gradesObj.t1?.toFixed(2) ?? '-'}</span> :
                                                            <input type="number" step="0.1" min="0" max="10" value={gradesObj.t1 ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 't1', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" />
                                                        }
                                                    </td>
                                                    <td className={`border ${calculated ? 'bg-gray-100' : ''}`}>
                                                        {calculated ?
                                                            <span className="p-1.5 block text-center font-medium text-gray-700">{gradesObj.t2?.toFixed(2) ?? '-'}</span> :
                                                            <input type="number" step="0.1" min="0" max="10" value={gradesObj.t2 ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 't2', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" />
                                                        }
                                                    </td>
                                                    {module.trimesters === 3 && (
                                                        <td className={`border ${calculated ? 'bg-gray-100' : ''}`}>
                                                            {calculated ?
                                                                <span className="p-1.5 block text-center font-medium text-gray-700">{gradesObj.t3?.toFixed(2) ?? '-'}</span> :
                                                                <input type="number" step="0.1" min="0" max="10" value={gradesObj.t3 ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 't3', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" />
                                                            }
                                                        </td>
                                                    )}
                                                    <td className="border"><input type="number" step="0.1" min="0" max="10" value={recVal ?? ''} onChange={e => handleCourseGradeChange(student.id, module.name, 'rec', e.target.value)} className="w-16 p-1.5 text-center bg-transparent focus:bg-yellow-100 outline-none" /></td>
                                                    <td className={`p-1.5 border font-bold ${gradesObj.final !== null && gradesObj.final < 5 ? 'text-red-600' : 'text-black'} bg-gray-200`}>{gradesObj.final?.toFixed(2) ?? '-'}</td>
                                                    <td className="border text-center">
                                                        <button onClick={() => handleToggleConvalidation(student.id, module.name)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Convalidar</button>
                                                    </td>
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                         ))}
                    </tbody>
                </table>
             </div>
        )}
        </div>
    </div>
  );
};

export default GestionAcademicaView;

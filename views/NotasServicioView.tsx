
import React, { useMemo, useCallback } from 'react';
import { Student, Service } from '../types';
import { SERVICE_GRADE_WEIGHTS } from '../data/constants';
import { ExportIcon } from '../components/icons';
import { downloadPdfWithTables } from '../components/printUtils';
import { useAppContext } from '../context/AppContext';

declare var XLSX: any;

interface NotasServicioViewProps {
    onNavigateToService: (serviceId: string, tab: 'evaluation') => void;
}

const NotasServicioView: React.FC<NotasServicioViewProps> = ({ onNavigateToService }) => {
    const { students, services, practiceGroups, serviceEvaluations, teacherData, instituteData, calculatedStudentGrades } = useAppContext();
    
    const sortedServices = useMemo(() => {
        return [...services].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [services]);

    const studentData = useMemo(() => {
        const studentGroups = students.reduce((acc, student) => {
            (acc[student.grupo] = acc[student.grupo] || []).push(student);
            return acc;
        }, {} as Record<string, Student[]>);

        Object.keys(studentGroups).forEach(groupName => {
            studentGroups[groupName].sort((a,b) => a.apellido1.localeCompare(b.apellido1));
        });

        const getScores = (student: Student) => {
            const serviceScores: Record<string, { final: number | null, absent: boolean }> = {};

            sortedServices.forEach(service => {
                const evaluation = serviceEvaluations.find(e => e.serviceId === service.id);
                const individualEval = evaluation?.serviceDay.individualScores[student.id];

                let studentParticipated = false;
                let groupEvalSourceId: string | undefined = undefined;
                
                const studentPracticeGroup = practiceGroups.find(pg => pg.studentIds.includes(student.id));

                // BRANCHING LOGIC BY SERVICE TYPE
                if (service.type === 'normal' && studentPracticeGroup) {
                    studentParticipated = (service.assignedGroups.comedor || []).includes(studentPracticeGroup.id) || 
                                       (service.assignedGroups.takeaway || []).includes(studentPracticeGroup.id);
                    groupEvalSourceId = studentPracticeGroup.id;
                } else if (service.type === 'agrupacion') {
                    const studentAgrupacion = (service.agrupaciones || []).find(a => a.studentIds.includes(student.id));
                    if (studentAgrupacion) {
                        studentParticipated = true;
                        groupEvalSourceId = studentAgrupacion.id;
                    }
                }
                
                if (!studentParticipated) {
                    serviceScores[service.id] = { final: null, absent: false };
                    return;
                }

                if (!evaluation) {
                    serviceScores[service.id] = { final: null, absent: false };
                    return;
                }

                // Presence defaults to True unless explicitly False
                const isPresent = individualEval ? (individualEval.attendance ?? true) : true;
                if (!isPresent) {
                    serviceScores[service.id] = { final: null, absent: true };
                    return;
                }
                
                // 1. Individual Part (60%)
                const hasIndividualData = individualEval?.scores?.some(s => s !== null);
                let individualGrade = (individualEval?.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                
                // 2. Group Part (40%)
                let groupGrade = 0;
                let hasGroupData = false;
                if (groupEvalSourceId) {
                    const groupEval = evaluation.serviceDay.groupScores[groupEvalSourceId];
                    if (groupEval) {
                        hasGroupData = groupEval.scores?.some(s => s !== null);
                        groupGrade = (groupEval.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                    }
                }
                
                // SKIP IF NO DATA ENTERED
                if (!hasIndividualData && !hasGroupData) {
                    serviceScores[service.id] = { final: null, absent: false };
                    return;
                }

                // INHERITANCE: If individual is blank but group is graded, student gets group grade
                if (!hasIndividualData && hasGroupData) {
                    individualGrade = groupGrade;
                }

                if (individualEval?.halveGroupScore) groupGrade /= 2;
                
                const finalServiceScore = (individualGrade * SERVICE_GRADE_WEIGHTS.individual) + (groupGrade * SERVICE_GRADE_WEIGHTS.group);
                serviceScores[service.id] = { final: finalServiceScore, absent: false };
            });
            
            return { serviceScores };
        };
        return { studentGroups, getScores };
    }, [students, sortedServices, practiceGroups, serviceEvaluations]);
    
    const handleExport = (format: 'pdf' | 'xlsx') => {
        const title = "Resumen de Notas de Servicio";
        const head = [["Alumno", ...sortedServices.map(s => s.name), "Media Serv. T1", "Media Serv. T2", "Media Serv. T3"]];

        const body = Object.values(studentData.studentGroups).flat().map((student: Student) => {
             const { serviceScores } = studentData.getScores(student);
             const averages = calculatedStudentGrades[student.id]?.serviceAverages || { t1: null, t2: null, t3: null };
             
            const row: (string | number | null)[] = [`${student.apellido1} ${student.apellido2}, ${student.nombre}`];
            sortedServices.forEach(service => {
                const scoreInfo = serviceScores[service.id];
                 if (!scoreInfo || (scoreInfo.final === null && !scoreInfo.absent)) {
                     row.push("-");
                 } else if (scoreInfo.absent) {
                    row.push("AUS");
                } else {
                    row.push(scoreInfo.final?.toFixed(2) ?? '-');
                }
            });
            row.push(averages.t1?.toFixed(2) ?? '-');
            row.push(averages.t2?.toFixed(2) ?? '-');
            row.push(averages.t3?.toFixed(2) ?? '-');
            return row;
        });

        if (format === 'pdf') {
            downloadPdfWithTables(title, [head], [body], teacherData, instituteData);
        } else {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([head[0], ...body]);
            XLSX.utils.book_append_sheet(wb, ws, title);
            XLSX.writeFile(wb, `${title.replace(/ /g, '_')}.xlsx`);
        }
    };

    return (
        <div>
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Resumen de Servicios</h1>
                    <p className="text-gray-500 mt-1">Vista general de todas las evaluaciones. Haz clic en un servicio para editar.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => handleExport('pdf')} disabled={sortedServices.length === 0} className="flex items-center bg-red-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-600 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"><ExportIcon className="w-4 h-4 mr-1" /> PDF</button>
                    <button onClick={() => handleExport('xlsx')} disabled={sortedServices.length === 0} className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"><ExportIcon className="w-4 h-4 mr-1" /> XLSX</button>
                </div>
            </header>
            {sortedServices.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-lg shadow">
                    <h2 className="text-2xl font-bold text-gray-700">No hay servicios planificados</h2>
                    <p className="text-gray-500 mt-2">Crea tu primer servicio en la sección de "Gestión Práctica" para empezar a calificar.</p>
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th rowSpan={2} className="p-2 border font-semibold text-gray-600 w-48 text-left sticky left-0 bg-gray-100">Alumno</th>
                                {sortedServices.map(service => (
                                    <th key={service.id} rowSpan={2} className="p-2 border font-semibold text-gray-600 min-w-[120px]">
                                        <button onClick={() => onNavigateToService(service.id, 'evaluation')} className="hover:text-blue-600 w-full">
                                            <span className="font-bold">{service.name}</span><br />
                                            <span className="font-normal text-gray-500">{new Date(service.date.replace(/-/g, '/')).toLocaleDateString('es-ES')}</span>
                                        </button>
                                    </th>
                                ))}
                                <th rowSpan={2} className="p-2 border font-semibold text-gray-600 bg-gray-200">Media Serv. T1</th>
                                <th rowSpan={2} className="p-2 border font-semibold text-gray-600 bg-gray-200">Media Serv. T2</th>
                                <th rowSpan={2} className="p-2 border font-semibold text-gray-600 bg-gray-200">Media Serv. T3</th>
                            </tr>
                             <tr></tr>
                        </thead>
                        <tbody>
                            {Object.entries(studentData.studentGroups).map(([groupName, studentsInGroup]: [string, Student[]]) => (
                                <React.Fragment key={groupName}>
                                    <tr><td colSpan={sortedServices.length + 4} className="bg-gray-200 font-bold p-1 text-left pl-4">{groupName}</td></tr>
                                    {studentsInGroup.map((student, index) => {
                                        const { serviceScores } = studentData.getScores(student);
                                        const averages = calculatedStudentGrades[student.id]?.serviceAverages || { t1: null, t2: null, t3: null };
                                        return (
                                        <tr key={student.id} className={`group ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}>
                                            <td className={`p-1 border text-left font-semibold text-gray-800 w-48 sticky left-0 group-hover:bg-blue-50 ${index % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>{`${student.apellido1} ${student.apellido2}, ${student.nombre}`}</td>
                                            {sortedServices.map(service => {
                                                const scoreInfo = serviceScores[service.id];
                                                const finalScore = scoreInfo?.final;
                                                return (
                                                    <td key={service.id} className={`p-1 border font-bold ${finalScore !== null && finalScore < 5 ? 'text-red-600' : ''}`}>
                                                        {!scoreInfo || (scoreInfo.final === null && !scoreInfo.absent) ? '-' : scoreInfo.absent ? <span className="text-red-500 font-semibold">AUS</span> : <span>{finalScore?.toFixed(2)}</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className={`p-1 border font-bold bg-gray-100 ${averages.t1 !== null && averages.t1 < 5 ? 'text-red-600' : ''}`}>{averages.t1?.toFixed(2) ?? '-'}</td>
                                            <td className={`p-1 border font-bold bg-gray-100 ${averages.t2 !== null && averages.t2 < 5 ? 'text-red-600' : ''}`}>{averages.t2?.toFixed(2) ?? '-'}</td>
                                            <td className={`p-1 border font-bold bg-gray-100 ${averages.t3 !== null && averages.t3 < 5 ? 'text-red-600' : ''}`}>{averages.t3?.toFixed(2) ?? '-'}</td>
                                        </tr>
                                    )})}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default NotasServicioView;

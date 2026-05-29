
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Student, TimelineEvent, PreServiceDayEvaluation, ResultadoAprendizaje, Service, CourseModuleGrades, GradeValue, CriterioEvaluacion, StudentCalculatedGrades, ActivityGrade } from '../types';
import { 
    PencilIcon,
    CameraIcon,
    SaveIcon,
    ArrowRightLeftIcon,
    MessageCircleIcon,
    PrinterIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    BarChartIcon,
    TrashIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { generateStudentFilePDF } from '../services/reportGenerator';
import { calculateRAGrade, calculateCriterioGrade } from '../services/academicAnalytics';
import { calculateStudentPeriodAverages, calculateModularGrades } from '../services/gradeCalculator';
import { ACADEMIC_EVALUATION_STRUCTURE, COURSE_MODULES, SERVICE_GRADE_WEIGHTS, PRACTICAL_EXAM_RUBRIC } from '../data/constants';

interface FichaAlumnoProps {
  student: Student;
  onBack: () => void;
  onUpdatePhoto: (studentId: string, photoUrl: string) => void;
  onUpdateStudent: (student: Student) => void;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode; isEditing?: boolean; children?: React.ReactNode }> = ({ label, value, isEditing, children }) => (
    <div className="grid grid-cols-3 gap-4 px-4 py-3 hover:bg-gray-50">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 col-span-2">{isEditing ? children : (value || '-')}</dd>
    </div>
);

const Tab: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium text-sm rounded-md transition-colors
            ${isActive
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
    >
        {label}
    </button>
);

const CombinedPerformanceChart: React.FC<{
    data: { name: string; studentGrade: number | null; classAverage: number | null }[];
}> = ({ data }) => {
    if (data.length === 0) return null;

    const chartHeight = 150; // in px
    const chartWidth = data.length * 60; // dynamic width
    const maxValue = 10;

    // Create SVG path for the line
    const points = data.map((item, index) => {
        if (item.classAverage === null) return null;
        const x = index * 60 + 30; // center of the bar
        const y = chartHeight - (item.classAverage / maxValue) * chartHeight;
        return `${x},${y}`;
    }).filter(Boolean).join(' ');

    return (
        <div className="w-full overflow-x-auto pb-4">
            <div style={{ width: Math.max(chartWidth, 300), height: chartHeight + 30 }} className="relative mx-auto">
                {/* Y-axis labels */}
                <div className="absolute -left-8 top-0 h-full flex flex-col justify-between text-xs text-gray-500" style={{ height: chartHeight }}>
                    <span>10</span>
                    <span>5</span>
                    <span>0</span>
                </div>

                {/* Bars */}
                <div className="absolute bottom-[30px] left-0 right-0 h-full flex justify-around items-end border-l border-b border-gray-200" style={{ height: chartHeight }}>
                    {data.map((item, index) => {
                        const barHeight = item.studentGrade !== null ? `${(item.studentGrade / maxValue) * 100}%` : '2%';
                        const barColor = item.studentGrade === null ? 'bg-gray-300' : item.studentGrade < 5 ? 'bg-orange-400' : 'bg-teal-400';
                        return (
                            <div key={index} className="flex-1 flex flex-col items-center justify-end px-2 h-full" title={`Tu nota: ${item.studentGrade?.toFixed(2) ?? 'N/A'}\nMedia clase: ${item.classAverage?.toFixed(2) ?? 'N/A'}`}>
                                <div className={`w-full max-w-[30px] rounded-t-md transition-all duration-500 ease-out ${barColor}`} style={{ height: barHeight }}></div>
                            </div>
                        );
                    })}
                </div>
                {/* Line */}
                <svg className="absolute top-0 left-0 w-full" style={{ height: chartHeight }}>
                    <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        points={points}
                    />
                    {data.map((item, index) => {
                        if (item.classAverage === null) return null;
                        const cx = index * 60 + 30;
                        const cy = chartHeight - (item.classAverage / maxValue) * chartHeight;
                        return <circle key={index} cx={cx} cy={cy} r="3" fill="#3b82f6" stroke="white" strokeWidth="1" />;
                    })}
                </svg>
                 {/* Labels */}
                <div className="absolute bottom-0 left-0 right-0 h-[30px] flex justify-around items-start">
                    {data.map((item, index) => (
                         <div key={index} className="flex-1 text-xs text-gray-500 text-center px-1 truncate" title={item.name}>{item.name}</div>
                    ))}
                </div>
            </div>
             <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
                <div className="flex items-center"><span className="w-3 h-3 bg-teal-400 mr-2 rounded-sm"></span>Tu Nota</div>
                <div className="flex items-center"><div className="w-4 h-0.5 bg-blue-500 mr-2"></div>Media de la Clase</div>
            </div>
        </div>
    );
};


const FichaAlumno: React.FC<FichaAlumnoProps> = ({ student, onBack, onUpdatePhoto, onUpdateStudent }) => {
  const { 
    students,
    teacherData, 
    instituteData,
    pcResultadosAprendizaje, pcCriteriosEvaluacion, pcInstrumentosEvaluacion,
    optativaResultadosAprendizaje, optativaCriteriosEvaluacion, optativaInstrumentosEvaluacion,
    proyectoResultadosAprendizaje, proyectoCriteriosEvaluacion, proyectoInstrumentosEvaluacion,
    academicGrades: allAcademicGrades,
    instrumentGrades,
    calculatedStudentGrades: allCalculatedGrades,
    courseGrades: allCourseGrades,
    setCourseGrades,
    services,
    practiceGroups,
    serviceEvaluations,
    practicalExamEvaluations: allPracticalExamEvaluations,
    entryExitRecords: allEntryExitRecords,
    handleDeleteEntryExitRecord,
    addToast
  } = useAppContext();

  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student>(student);
  const [activeTab, setActiveTab] = useState('general');
  const [expandedRAs, setExpandedRAs] = useState<Set<string>>(new Set());
  const [expandedAcademicRows, setExpandedAcademicRows] = useState<Set<string>>(new Set());
  const [activeModuleForRA, setActiveModuleForRA] = useState<'pc' | 'optativa' | 'proyecto'>('pc');

  const getGradeNormal = useCallback((studentId: string, activityId: string) => {
      const g = instrumentGrades[studentId]?.[activityId];
      if (g === null || g === undefined) return null;
      if (typeof g === 'object' && 'normal' in g) return g.normal;
      if (typeof g === 'number') return g;
      return null;
  }, [instrumentGrades]);

  const getGradeRec1 = useCallback((studentId: string, activityId: string) => {
      const g = instrumentGrades[studentId]?.[activityId];
      if (g === null || g === undefined) return null;
      if (typeof g === 'object' && 'rec1' in g) return g.rec1;
      return null;
  }, [instrumentGrades]);

  const getGradeRec2 = useCallback((studentId: string, activityId: string) => {
      const g = instrumentGrades[studentId]?.[activityId];
      if (g === null || g === undefined) return null;
      if (typeof g === 'object' && 'rec2' in g) return g.rec2;
      return null;
  }, [instrumentGrades]);

  const getExamFinalGrade = useCallback((studentId: string, activityId: string) => {
      const normal = getGradeNormal(studentId, activityId);
      const rec1 = getGradeRec1(studentId, activityId);
      const rec2 = getGradeRec2(studentId, activityId);
      if (normal === null && rec1 === null && rec2 === null) return null;
      return Math.max(normal ?? 0, rec1 ?? 0, rec2 ?? 0);
  }, [getGradeNormal, getGradeRec1, getGradeRec2]);

  const examsByTrimester = useMemo(() => {
    const examInstrument = Object.values(pcInstrumentosEvaluacion).find(inst => 
        inst.nombre?.toLowerCase() === 'examen' || inst.id?.toLowerCase() === 'examen'
    );
    if (!examInstrument) return { t1: [], t2: [], t3: [] };
    return {
        t1: (examInstrument.activities || []).filter(a => a.trimester === 't1'),
        t2: (examInstrument.activities || []).filter(a => a.trimester === 't2'),
        t3: (examInstrument.activities || []).filter(a => a.trimester === 't3')
    };
  }, [pcInstrumentosEvaluacion]);

  const renderExamsForTrimester = (trimester: 't1' | 't2' | 't3', label: string) => {
      const activities = examsByTrimester[trimester];
      if (activities.length === 0) return null;
      const key = `exam-${trimester}`;
      const isExpanded = expandedAcademicRows.has(key);
      
      const gradedActivities = activities.map(a => getExamFinalGrade(student.id, a.id)).filter(g => g !== null) as number[];
      const avgGrade = gradedActivities.length > 0 ? gradedActivities.reduce((sum, g) => sum + g, 0) / gradedActivities.length : null;
      
      return (
          <React.Fragment key={key}>
              <tr className="border-b cursor-pointer hover:bg-gray-100" onClick={() => setExpandedAcademicRows(p => {
                  const next = new Set(p);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
              })}>
                  <td className="p-2 font-medium text-left">{label}</td>
                  <td className="p-2 font-bold">{avgGrade !== null ? <span className={avgGrade < 5 ? 'text-red-500' : 'text-green-600'}>{avgGrade.toFixed(2)}</span> : '-'}</td>
                  <td className="p-2" colSpan={3}>
                      <div className="flex justify-center">
                          {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-blue-500 font-bold" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                      </div>
                  </td>
              </tr>
              {isExpanded && activities.map(act => {
                  const normal = getGradeNormal(student.id, act.id);
                  const rec1 = getGradeRec1(student.id, act.id);
                  const rec2 = getGradeRec2(student.id, act.id);
                  const finalGrade = Math.max(normal ?? 0, rec1 ?? 0, rec2 ?? 0);
                  const hasSomeGrade = normal !== null || rec1 !== null || rec2 !== null;
                  return (
                      <tr key={act.id} className="bg-gray-50 text-xs">
                          <td className="p-2 pl-6 text-left">{act.name}</td>
                          <td className="p-2">{normal !== null ? normal.toFixed(2) : '-'}</td>
                          <td className="p-2">{rec1 !== null ? rec1.toFixed(2) : '-'}</td>
                          <td className="p-2">{rec2 !== null ? rec2.toFixed(2) : '-'}</td>
                          <td className={`p-2 font-bold ${hasSomeGrade ? (finalGrade < 5 ? 'text-red-500' : 'text-green-600') : ''}`}>{hasSomeGrade ? finalGrade.toFixed(2) : '-'}</td>
                      </tr>
                  );
              })}
          </React.Fragment>
      );
  };



  const fullName = `${student.apellido1} ${student.apellido2}, ${student.nombre}`.trim();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditedStudent(student) }, [student]);

  const studentEntryExitRecords = useMemo(() => 
    allEntryExitRecords.filter(r => r.studentId === student.id), 
    [allEntryExitRecords, student.id]
  );
  
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };

    studentEntryExitRecords.forEach(rec => {
        events.push({
            date: parseDate(rec.date),
            type: 'incidencia',
            title: rec.type,
            content: rec.reason,
        });
    });

    serviceEvaluations.forEach(ev => {
        const service = services.find(s => s.id === ev.serviceId);
        if(!service) return;

        Object.entries(ev.preService).forEach(([date, preServiceDay]) => {
            const obs = (preServiceDay as PreServiceDayEvaluation).individualEvaluations[student.id]?.observations;
            if (obs) {
                events.push({ date: new Date(date), type: 'observacion', title: `Observación Pre-Servicio`, content: obs, serviceName: service.name });
            }
        });

        const serviceDayObs = ev.serviceDay.individualScores[student.id]?.observations;
        if(serviceDayObs) {
            events.push({ date: new Date(service.date), type: 'observacion', title: `Observación Día de Servicio`, content: serviceDayObs, serviceName: service.name });
        }
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [studentEntryExitRecords, serviceEvaluations, services, student.id]);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (typeof loadEvent.target?.result === 'string') onUpdatePhoto(student.id, loadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedStudent(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    onUpdateStudent(editedStudent);
    setIsEditing(false);
  };
  const handleCancel = () => {
    setEditedStudent(student);
    setIsEditing(false);
  };

  const handlePrint = () => {
      generateStudentFilePDF(
          student,
          allCalculatedGrades[student.id],
          allAcademicGrades[student.id],
          allCourseGrades[student.id],
          timelineEvents,
          teacherData,
          instituteData
      );
  };
  
  const handleDeleteRecord = (id: string) => {
      if (window.confirm("¿Estás seguro de que quieres anular este registro de entrada/salida?")) {
          handleDeleteEntryExitRecord(id);
      }
  };

  const handleToggleConvalidation = (moduleName: string) => {
    setCourseGrades(prev => {
        const newGrades = JSON.parse(JSON.stringify(prev));
        if (!newGrades[student.id]) newGrades[student.id] = {};
        if (!newGrades[student.id][moduleName]) newGrades[student.id][moduleName] = {};

        const currentStatus = newGrades[student.id][moduleName].isConvalidated || false;
        newGrades[student.id][moduleName].isConvalidated = !currentStatus;

        if (!currentStatus) { // Si se está convalidando, limpiar notas
            newGrades[student.id][moduleName].t1 = null;
            newGrades[student.id][moduleName].t2 = null;
            newGrades[student.id][moduleName].t3 = null;
            newGrades[student.id][moduleName].rec = null;
        }
        
        return newGrades;
    });
    addToast('Estado de convalidación actualizado.', 'success');
  };
  
   const studentServicesData = useMemo(() => {
        const studentPracticeGroup = practiceGroups.find(pg => pg.studentIds.includes(student.id));

        return services
            .map(service => {
                const evaluation = serviceEvaluations.find(e => e.serviceId === service.id);

                let participationInfo = null;
                let groupEvalSourceId: string | undefined = undefined;

                if (service.type === 'normal' && studentPracticeGroup && (service.assignedGroups.comedor.includes(studentPracticeGroup.id) || service.assignedGroups.takeaway.includes(studentPracticeGroup.id))) {
                    participationInfo = { groupName: studentPracticeGroup.name };
                    groupEvalSourceId = studentPracticeGroup.id;
                } else if (service.type === 'agrupacion') {
                    const agrupacion = service.agrupaciones?.find(a => a.studentIds.includes(student.id));
                    if (agrupacion) {
                        participationInfo = { groupName: `Agrup. ${agrupacion.name}` };
                        groupEvalSourceId = agrupacion.id;
                    }
                }
                
                if (!participationInfo) return null;

                if (!evaluation) {
                    return {
                        service,
                        studentGrade: null,
                        classAverage: null,
                        individualGrade: null,
                        groupGrade: null,
                        observations: "",
                        groupName: participationInfo.groupName,
                        isAbsent: false
                    };
                }

                const individualEval = evaluation.serviceDay.individualScores[student.id];
                const isPresent = individualEval ? (individualEval.attendance ?? true) : true;
                
                if (!isPresent) {
                    // Compute class average as well
                    const gradesOfAllStudents: number[] = [];
                    students.forEach(s => {
                        let sParticipated = false;
                        let sGroupSourceId: string | undefined = undefined;
                        const sPracticeGroup = practiceGroups.find(pg => pg.studentIds.includes(s.id));

                        if (service.type === 'normal' && sPracticeGroup && (service.assignedGroups.comedor.includes(sPracticeGroup.id) || service.assignedGroups.takeaway.includes(sPracticeGroup.id))) {
                            sParticipated = true;
                            sGroupSourceId = sPracticeGroup.id;
                        } else if (service.type === 'agrupacion') {
                            const sAgrup = (service.agrupaciones || []).find(a => a.studentIds.includes(s.id));
                            if (sAgrup) {
                                sParticipated = true;
                                sGroupSourceId = sAgrup.id;
                            }
                        }

                        if (sParticipated) {
                            const sIndividualEval = evaluation.serviceDay.individualScores[s.id];
                            const sIsPresent = sIndividualEval ? (sIndividualEval.attendance ?? true) : true;
                            
                            if (!sIsPresent) {
                                gradesOfAllStudents.push(0);
                            } else {
                                let sGroupGrade = 0;
                                let sHasGroupData = false;
                                if (sGroupSourceId) {
                                    const sGroupEval = evaluation.serviceDay.groupScores[sGroupSourceId];
                                    if (sGroupEval) {
                                        sHasGroupData = sGroupEval.scores?.some(sc => sc !== null);
                                        sGroupGrade = (sGroupEval.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                                    }
                                }
                                const sHasIndData = sIndividualEval?.scores?.some(sc => sc !== null);
                                let sIndividualGrade = (sIndividualEval?.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                                if (!sHasIndData && sHasGroupData) sIndividualGrade = sGroupGrade;
                                if (sIndividualEval?.halveGroupScore) sGroupGrade /= 2;
                                gradesOfAllStudents.push((sIndividualGrade * SERVICE_GRADE_WEIGHTS.individual) + (sGroupGrade * SERVICE_GRADE_WEIGHTS.group));
                            }
                        }
                    });
                    const classAverage = gradesOfAllStudents.length > 0 ? gradesOfAllStudents.reduce((a, b) => a + b, 0) / gradesOfAllStudents.length : null;

                    return {
                        service,
                        studentGrade: 0,
                        classAverage,
                        individualGrade: 0,
                        groupGrade: 0,
                        observations: "AUSENTE" + (individualEval?.observations ? ` | ${individualEval.observations}` : ""),
                        groupName: participationInfo.groupName,
                        isAbsent: true
                    };
                }

                // 1. Group / Agrupacion Grade
                let groupGrade = 0;
                let hasGroupData = false;
                if (groupEvalSourceId) {
                    const groupEval = evaluation.serviceDay.groupScores[groupEvalSourceId];
                    if (groupEval) {
                        hasGroupData = groupEval.scores?.some(s => s !== null);
                        groupGrade = (groupEval.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                    }
                }

                // 2. Individual Grade (60% weight)
                const hasIndividualData = individualEval?.scores?.some(s => s !== null);
                let individualGrade = (individualEval?.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                
                // INHERITANCE: 100% of group grade if individual is blank
                if (!hasIndividualData && hasGroupData) {
                    individualGrade = groupGrade;
                }

                if (individualEval?.halveGroupScore) groupGrade /= 2;

                const studentFinalGrade = (individualGrade * SERVICE_GRADE_WEIGHTS.individual) + (groupGrade * SERVICE_GRADE_WEIGHTS.group);
                
                const observations = [
                    individualEval?.observations,
                    groupEvalSourceId ? evaluation.serviceDay.groupScores[groupEvalSourceId]?.observations : ''
                ].filter(Boolean).join(' | ');
                
                // Class Average Calculation (Sync logic)
                const gradesOfAllStudents: number[] = [];
                students.forEach(s => {
                    let sParticipated = false;
                    let sGroupSourceId: string | undefined = undefined;
                    const sPracticeGroup = practiceGroups.find(pg => pg.studentIds.includes(s.id));

                    if (service.type === 'normal' && sPracticeGroup && (service.assignedGroups.comedor.includes(sPracticeGroup.id) || service.assignedGroups.takeaway.includes(sPracticeGroup.id))) {
                        sParticipated = true;
                        sGroupSourceId = sPracticeGroup.id;
                    } else if (service.type === 'agrupacion') {
                        const sAgrup = (service.agrupaciones || []).find(a => a.studentIds.includes(s.id));
                        if (sAgrup) {
                            sParticipated = true;
                            sGroupSourceId = sAgrup.id;
                        }
                    }

                    if (sParticipated) {
                        const sIndividualEval = evaluation.serviceDay.individualScores[s.id];
                        const sIsPresent = sIndividualEval ? (sIndividualEval.attendance ?? true) : true;
                        
                        if (!sIsPresent) {
                            gradesOfAllStudents.push(0);
                        } else {
                            let sGroupGrade = 0;
                            let sHasGroupData = false;
                            if (sGroupSourceId) {
                                const sGroupEval = evaluation.serviceDay.groupScores[sGroupSourceId];
                                if (sGroupEval) {
                                    sHasGroupData = sGroupEval.scores?.some(sc => sc !== null);
                                    sGroupGrade = (sGroupEval.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                                }
                            }
                            
                            const sHasIndData = sIndividualEval?.scores?.some(sc => sc !== null);
                            let sIndividualGrade = (sIndividualEval?.scores || []).reduce((sum, score) => sum + (score || 0), 0);
                            
                            if (!sHasIndData && sHasGroupData) sIndividualGrade = sGroupGrade;

                            if (sIndividualEval?.halveGroupScore) sGroupGrade /= 2;
                            gradesOfAllStudents.push((sIndividualGrade * SERVICE_GRADE_WEIGHTS.individual) + (sGroupGrade * SERVICE_GRADE_WEIGHTS.group));
                        }
                    }
                });
                const classAverage = gradesOfAllStudents.length > 0 ? gradesOfAllStudents.reduce((a, b) => a + b, 0) / gradesOfAllStudents.length : null;

                return { service, studentGrade: studentFinalGrade, classAverage, individualGrade, groupGrade, observations, groupName: participationInfo.groupName, isAbsent: false };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null)
            .sort((a,b) => new Date(a.service.date).getTime() - new Date(b.service.date).getTime());
    }, [student.id, students, services, serviceEvaluations, practiceGroups]);

    const { currentRAs, currentCriterios } = useMemo(() => {
        switch (activeModuleForRA) {
            case 'pc':
                return { currentRAs: pcResultadosAprendizaje, currentCriterios: pcCriteriosEvaluacion };
            case 'optativa':
                return { currentRAs: optativaResultadosAprendizaje, currentCriterios: optativaCriteriosEvaluacion };
            case 'proyecto':
                return { currentRAs: proyectoResultadosAprendizaje, currentCriterios: proyectoCriteriosEvaluacion };
            default:
                return { currentRAs: {}, currentCriterios: {} };
        }
    }, [activeModuleForRA, pcResultadosAprendizaje, pcCriteriosEvaluacion, optativaResultadosAprendizaje, optativaCriteriosEvaluacion, proyectoResultadosAprendizaje, proyectoCriteriosEvaluacion]);

  const TimelineIcon: React.FC<{type: TimelineEvent['type']}> = ({ type }) => {
    const baseClass = "w-8 h-8 rounded-full flex items-center justify-center text-white";
    if (type === 'incidencia') return <div className={`${baseClass} bg-orange-500`}><ArrowRightLeftIcon className="w-5 h-5"/></div>;
    if (type === 'observacion') return <div className={`${baseClass} bg-blue-500`}><MessageCircleIcon className="w-5 h-5"/></div>;
    return null;
  };
  
  return (
    <div>
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div className="flex items-center">
            <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <img className="h-20 w-20 rounded-full object-cover mr-4" src={student.fotoUrl} alt={`Foto de ${fullName}`} />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity duration-300">
                    <CameraIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <div>
                <h1 className="text-4xl font-bold text-gray-800">{fullName}</h1>
                <p className="text-gray-500 text-lg">{student.grupo} | {student.emailOficial}</p>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            {isEditing ? (
                <>
                    <button onClick={handleSave} className="flex items-center bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition"><SaveIcon className="w-4 h-4 mr-2" />Guardar</button>
                    <button onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Cancelar</button>
                </>
            ) : (
                 <>
                    <button onClick={handlePrint} className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition"><PrinterIcon className="w-4 h-4 mr-2" />Imprimir Ficha</button>
                    <button onClick={() => setIsEditing(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"><PencilIcon className="w-4 h-4 mr-2" />Editar Ficha</button>
                 </>
            )}
            <button onClick={onBack} className="text-gray-600 hover:text-gray-800 font-medium text-2xl leading-none p-1 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">&times;</button>
        </div>
      </header>

      <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-2">
                <Tab label="Información General" isActive={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                <Tab label="Resumen Académico" isActive={activeTab === 'academico'} onClick={() => setActiveTab('academico')} />
                <Tab label="Resultados de Aprendizaje" isActive={activeTab === 'ra'} onClick={() => setActiveTab('ra')} />
                <Tab label="Resumen de Servicios" isActive={activeTab === 'servicios'} onClick={() => setActiveTab('servicios')} />
            </nav>
        </div>

        {activeTab === 'general' && (
             <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="w-full xl:col-span-2 bg-white shadow-md rounded-lg overflow-hidden">
                    <div className="p-4 border-b"><h3 className="text-lg font-bold text-gray-800">Datos Personales</h3></div>
                    <dl className="divide-y divide-gray-200">
                        <InfoRow label="NRE" value={editedStudent.nre} isEditing={isEditing}><input name="nre" value={editedStudent.nre} onChange={handleInputChange} className="w-full p-1 border rounded" /></InfoRow>
                        <InfoRow label="Nº Expediente" value={editedStudent.expediente} isEditing={isEditing}><input name="expediente" value={editedStudent.expediente} onChange={handleInputChange} className="w-full p-1 border rounded" /></InfoRow>
                        <InfoRow label="Fecha de Nacimiento" value={editedStudent.fechaNacimiento} isEditing={isEditing}><input name="fechaNacimiento" value={editedStudent.fechaNacimiento} onChange={handleInputChange} className="w-full p-1 border rounded" type="date" /></InfoRow>
                        <InfoRow label="Teléfono" value={editedStudent.telefono} isEditing={isEditing}><input name="telefono" value={editedStudent.telefono} onChange={handleInputChange} className="w-full p-1 border rounded" /></InfoRow>
                        <InfoRow label="Email Personal" value={editedStudent.emailPersonal} isEditing={isEditing}><input name="emailPersonal" value={editedStudent.emailPersonal} onChange={handleInputChange} className="w-full p-1 border rounded" type="email" /></InfoRow>
                    </dl>
                </div>
                <div className="w-full xl:col-span-1 space-y-6">
                     <div className="bg-white shadow-md rounded-lg p-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-orange-600 flex items-center">
                            <ArrowRightLeftIcon className="w-5 h-5 mr-2"/> Registro de Salidas y Entradas
                        </h3>
                        <div className="max-h-64 overflow-y-auto pr-2 space-y-2 text-sm">
                            {studentEntryExitRecords.length > 0 ? (
                                studentEntryExitRecords.map(record => (
                                    <div key={record.id} className="p-2 bg-gray-50 rounded-md group hover:bg-gray-100 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-semibold">{record.date} - <span className={record.type === 'Salida Anticipada' ? 'text-red-600' : 'text-blue-600'}>{record.type}</span></p>
                                                <p className="text-gray-600 break-words text-xs">{record.reason}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteRecord(record.id)} 
                                                className="ml-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Anular Registro"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic text-center">No hay registros de salidas o entradas.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white shadow-md rounded-lg p-4 sticky top-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Historial y Anotaciones</h3>
                        <div className="relative max-h-96 overflow-y-auto pr-2">
                            {timelineEvents.length > 0 ? timelineEvents.map((event, index) => (
                                <div key={index} className="flex gap-4 pb-6">
                                    <div className="relative"><TimelineIcon type={event.type} />{index < timelineEvents.length - 1 && <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200"></div>}</div>
                                    <div><p className="text-xs text-gray-500">{event.date.toLocaleDateString('es-ES')}{event.serviceName && ` - ${event.serviceName}`}</p><p className="font-bold text-sm">{event.title}</p><p className="text-sm text-gray-600">{event.content}</p></div>
                                </div>
                            )) : <p className="text-sm text-gray-500 text-center py-4">No hay eventos en el historial.</p>}
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {activeTab === 'academico' && (
             <div className="space-y-8">
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-800 p-4 border-b">Resumen Integral de Calificaciones</h3>
                    <div className="overflow-x-auto p-4">
                        <h4 className="font-bold text-gray-700 mb-2">Exámenes (PC)</h4>
                        <table className="min-w-full text-sm text-center mb-6">
                             <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                                 <tr>
                                     <th>Examen</th>
                                     <th>Nota</th>
                                     <th>Rec 1</th>
                                     <th>Rec 2</th>
                                     <th>Nota Final</th>
                                 </tr>
                             </thead>
                             <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
                                     {renderExamsForTrimester('t1', '1º Trimestre')}
                                     {renderExamsForTrimester('t2', '2º Trimestre')}
                                     {renderExamsForTrimester('t3', '3º Trimestre')}
                                     {(() => {
                                        const t1Grades = examsByTrimester.t1.map(a => getExamFinalGrade(student.id, a.id)).filter(g => g !== null) as number[];
                                        const t1Avg = t1Grades.length > 0 ? t1Grades.reduce((sum, val) => sum + val, 0) / t1Grades.length : null;

                                        const t2Grades = examsByTrimester.t2.map(a => getExamFinalGrade(student.id, a.id)).filter(g => g !== null) as number[];
                                        const t2Avg = t2Grades.length > 0 ? t2Grades.reduce((sum, val) => sum + val, 0) / t2Grades.length : null;

                                        const t3Grades = examsByTrimester.t3.map(a => getExamFinalGrade(student.id, a.id)).filter(g => g !== null) as number[];
                                        const t3Avg = t3Grades.length > 0 ? t3Grades.reduce((sum, val) => sum + val, 0) / t3Grades.length : null;

                                        const periodsWithGrades = [t1Avg, t2Avg, t3Avg].filter(g => g !== null) as number[];
                                        const finalGrade = periodsWithGrades.length > 0 ? periodsWithGrades.reduce((a, b) => a + b, 0) / periodsWithGrades.length : null;
                                        return (
                                            <tr className="bg-gray-100 font-bold border-t">
                                                <td className="p-2 text-left">Nota Final</td>
                                                <td className="p-2 font-bold" colSpan={4}>{finalGrade !== null ? finalGrade.toFixed(2) : '-'}</td>
                                            </tr>
                                        );
                                     })()}
                             </tbody>
                        </table>

                         <h4 className="font-bold text-gray-700 mb-2">Servicios y Prácticos (Averages)</h4>
                         <table className="min-w-full text-sm text-center">
                             <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                                 <tr>
                                     <th className="p-2 text-left">Categoría</th>
                                     <th className="p-2">Nota</th>
                                     <th className="p-2"></th>
                                 </tr>
                             </thead>
                             <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
                                {['t1', 't2', 't3'].map(pKey => {
                                    const trTitle = pKey === 't1' ? '1º Trimestre' : pKey === 't2' ? '2º Trimestre' : '3º Trimestre';
                                    const expandedKey = `academico-period-${pKey}`;
                                    const isExpanded = expandedAcademicRows.has(expandedKey);
                                    return (
                                        <React.Fragment key={pKey}>
                                            <tr className="bg-gray-100 font-bold border-t cursor-pointer" onClick={() => setExpandedAcademicRows(p => p.has(expandedKey) ? (p.delete(expandedKey), new Set(p)) : new Set(p.add(expandedKey)))}>
                                                <td className="p-2 text-left">{trTitle}</td>
                                                <td className="p-2 text-center" colSpan={2}>
                                                    {isExpanded ? <ChevronDownIcon className="w-4 h-4 mx-auto" /> : <ChevronRightIcon className="w-4 h-4 mx-auto" />}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <>
                                                    {/* Servicios Section */}
                                                    {(() => {
                                                        const servicesInPeriod = studentServicesData.filter(s => s.service.trimester === pKey);
                                                        if (servicesInPeriod.length === 0) return null;
                                                        const gradedServices = servicesInPeriod.map(s => s.studentGrade).filter(g => g !== null) as number[];
                                                         const avg = gradedServices.length > 0 ? gradedServices.reduce((sum, s) => sum + s, 0) / gradedServices.length : null;
                                                        const servKey = `servicios-${pKey}`;
                                                        const isServExpanded = expandedAcademicRows.has(servKey);
                                                        return (
                                                            <React.Fragment key={servKey}>
                                                                <tr className="border-b cursor-pointer hover:bg-gray-100" onClick={() => setExpandedAcademicRows(p => p.has(servKey) ? (p.delete(servKey), new Set(p)) : new Set(p.add(servKey)))}>
                                                                    <td className="p-2 pl-6 text-left">Servicios</td>
                                                                    <td className="p-2 font-bold">{avg !== null ? (avg < 5 ? <span className="text-red-500">{avg.toFixed(2)}</span> : <span className="text-green-600">{avg.toFixed(2)}</span>) : '-'}</td>
                                                                    <td className="p-2">{isServExpanded ? <ChevronDownIcon className="w-4 h-4 mx-auto" /> : <ChevronRightIcon className="w-4 h-4 mx-auto" />}</td>
                                                                </tr>
                                                                {isServExpanded && servicesInPeriod.map(s => (
                                                                    <tr key={s.service.id} className="bg-gray-50 text-xs">
                                                                        <td className="p-2 pl-12 text-left">{s.service.name}</td>
                                                                        <td className="p-2 font-medium">{s.isAbsent ? <span className="text-red-500 font-semibold">AUS</span> : s.studentGrade !== null ? (s.studentGrade < 5 ? <span className="text-red-500">{s.studentGrade.toFixed(2)}</span> : <span className="text-green-600">{s.studentGrade.toFixed(2)}</span>) : '-'}</td>
                                                                        <td className="p-2"></td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        )
                                                    })()}
                                                    {/* Ex. Práctico Section */}
                                                     {(() => {
                                                         const practicalEval = allPracticalExamEvaluations.find(e => e.studentId === student.id && e.examPeriod === pKey);
                                                         const finalScore = practicalEval?.finalScore ?? null;
                                                         
                                                         const pracKey = `practico-${pKey}`;
                                                         const isPracExpanded = expandedAcademicRows.has(pracKey);
                                                         return (
                                                             <React.Fragment key={pracKey}>
                                                                 <tr className="border-b cursor-pointer hover:bg-gray-100" onClick={() => setExpandedAcademicRows(p => {
                                                                     const next = new Set(p);
                                                                     if (next.has(pracKey)) next.delete(pracKey);
                                                                     else next.add(pracKey);
                                                                     return next;
                                                                 })}>
                                                                     <td className="p-2 pl-6 text-left">Ex. Práctico</td>
                                                                     <td className="p-2 font-bold">{finalScore !== null && finalScore !== undefined ? (finalScore < 5 ? <span className="text-red-500">{finalScore.toFixed(2)}</span> : <span className="text-green-600">{finalScore.toFixed(2)}</span>) : '-'}</td>
                                                                     <td className="p-2">{isPracExpanded ? <ChevronDownIcon className="w-4 h-4 mx-auto" /> : <ChevronRightIcon className="w-4 h-4 mx-auto" />}</td>
                                                                 </tr>
                                                                 {isPracExpanded && (
                                                                     <>
                                                                         {practicalEval ? (
                                                                             PRACTICAL_EXAM_RUBRIC.map(ra => {
                                                                                 let raScoreSum = 0;
                                                                                 let criteriaCount = 0;
                                                                                 ra.criteria.forEach(criterion => {
                                                                                     const scoreInfo = practicalEval.scores?.[ra.id]?.[criterion.id];
                                                                                     if (scoreInfo && typeof scoreInfo.score === 'number') {
                                                                                         raScoreSum += scoreInfo.score;
                                                                                         criteriaCount++;
                                                                                     }
                                                                                 });
                                                                                 const raAvg = criteriaCount > 0 ? raScoreSum / criteriaCount : null;
                                                                                 const raRowKey = `ra-${pKey}-${ra.id}`;
                                                                                 const isRaExpanded = expandedAcademicRows.has(raRowKey);

                                                                                 return (
                                                                                     <React.Fragment key={ra.id}>
                                                                                         <tr className="bg-gray-50 text-xs border-b cursor-pointer hover:bg-gray-100" onClick={() => setExpandedAcademicRows(p => {
                                                                                             const next = new Set(p);
                                                                                             if (next.has(raRowKey)) next.delete(raRowKey);
                                                                                             else next.add(raRowKey);
                                                                                             return next;
                                                                                         })}>
                                                                                             <td className="p-2 pl-10 text-left font-semibold text-gray-700 flex items-center">
                                                                                                 {isRaExpanded ? <ChevronDownIcon className="w-3 mx-1 font-bold text-blue-500" /> : <ChevronRightIcon className="w-3 mx-1 text-gray-400" />}
                                                                                                 {ra.name} ({(ra.weight * 100).toFixed(0)}%)
                                                                                             </td>
                                                                                             <td className="p-2 font-bold text-center">
                                                                                                 {raAvg !== null ? (raAvg < 5 ? <span className="text-red-500">{raAvg.toFixed(2)}</span> : <span className="text-green-600">{raAvg.toFixed(2)}</span>) : '-'}
                                                                                             </td>
                                                                                             <td className="p-2"></td>
                                                                                         </tr>
                                                                                         {isRaExpanded && ra.criteria.map(criterion => {
                                                                                             const scoreInfo = practicalEval.scores?.[ra.id]?.[criterion.id];
                                                                                             return (
                                                                                                 <tr key={criterion.id} className="bg-gray-100 text-[11px] leading-relaxed">
                                                                                                     <td className="p-2 pl-16 text-left text-gray-600 max-w-sm truncate" title={criterion.name}>
                                                                                                         {criterion.name}
                                                                                                     </td>
                                                                                                     <td className="p-2 text-center text-gray-700 font-medium">
                                                                                                         {scoreInfo?.score !== null && scoreInfo?.score !== undefined ? scoreInfo.score : '-'}
                                                                                                     </td>
                                                                                                     <td className="p-2 text-left text-gray-500 max-w-xs truncate" title={scoreInfo?.notes}>
                                                                                                         {scoreInfo?.notes || ''}
                                                                                                     </td>
                                                                                                 </tr>
                                                                                             );
                                                                                         })}
                                                                                     </React.Fragment>
                                                                                 );
                                                                             })
                                                                         ) : (
                                                                             <tr className="bg-gray-50 text-xs">
                                                                                 <td colSpan={3} className="p-2 pl-12 text-left italic text-gray-400">Rúbrica práctica vacía o examen no evaluado todavía.</td>
                                                                             </tr>
                                                                         )}
                                                                     </>
                                                                 )}
                                                             </React.Fragment>
                                                         )
                                                     })()}
                                                </>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                             </tbody>
                        </table>
                    </div>
                </div>
                 <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-800 p-4 border-b">Resumen de Otros Módulos</h3>
                     <div className="overflow-x-auto">
                           <table className="min-w-full text-sm text-center">
                                <thead className="bg-gray-50 text-xs text-gray-600 uppercase"><tr><th className="px-4 py-3 text-left">Módulo</th><th>T1</th><th>T2</th><th>T3</th><th>REC</th><th className="px-4 py-3">Media Final</th></tr></thead>
                                <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
                                    {COURSE_MODULES.map(mod => {
                                        const isConvalidated = allCourseGrades[student.id]?.[mod.name]?.isConvalidated;
                                        
                                        let gradesObj: { t1: number | null, t2: number | null, t3: number | null, final: number | null };
                                        let calculated = false;

                                        if (mod.name === 'Optativa') {
                                            gradesObj = calculateModularGrades(student.id, instrumentGrades, optativaInstrumentosEvaluacion);
                                            calculated = true;
                                        } else if (mod.name === 'Proyecto') {
                                            gradesObj = calculateModularGrades(student.id, instrumentGrades, proyectoInstrumentosEvaluacion);
                                            calculated = true;
                                        } else {
                                            const stored = allCourseGrades[student.id]?.[mod.name] || {};
                                            const valid = [stored.t1, stored.t2, mod.trimesters === 3 ? stored.t3 : null].filter(g => g !== null && g !== undefined) as number[];
                                            gradesObj = {
                                                t1: stored.t1 ?? null,
                                                t2: stored.t2 ?? null,
                                                t3: stored.t3 ?? null,
                                                final: valid.length > 0 ? (valid.reduce((a,b) => a+b, 0) / valid.length) : null
                                            };
                                        }

                                        const recVal = allCourseGrades[student.id]?.[mod.name]?.rec ?? null;

                                        return (
                                            <tr key={mod.name}>
                                                <td className="px-4 py-2 text-left font-medium">{mod.name}</td>
                                                {isConvalidated ? (
                                                    <td colSpan={5} className="text-center font-bold text-green-600 bg-green-50">CONVALIDADA</td>
                                                ) : (
                                                    <>
                                                        <td className={calculated ? "bg-gray-50 font-medium" : ""}>{gradesObj.t1 !== null ? <span className={gradesObj.t1 < 5 ? 'text-red-500' : 'text-green-600'}>{gradesObj.t1.toFixed(2)}</span> : '-'}</td>
                                                        <td className={calculated ? "bg-gray-50 font-medium" : ""}>{gradesObj.t2 !== null ? <span className={gradesObj.t2 < 5 ? 'text-red-500' : 'text-green-600'}>{gradesObj.t2.toFixed(2)}</span> : '-'}</td>
                                                        <td className={calculated ? "bg-gray-50 font-medium" : ""}>{mod.trimesters === 3 ? (gradesObj.t3 !== null ? <span className={gradesObj.t3 < 5 ? 'text-red-500' : 'text-green-600'}>{gradesObj.t3.toFixed(2)}</span> : '-') : <span className="text-gray-400">N/A</span>}</td>
                                                        <td>{recVal !== null ? <span className={recVal < 5 ? 'text-red-500' : 'text-green-600'}>{recVal.toFixed(2)}</span> : '-'}</td>
                                                        <td className={`font-bold ${gradesObj.final !== null ? (gradesObj.final < 5 ? 'text-red-600' : 'text-green-600') : ''}`}>{gradesObj.final?.toFixed(2) ?? '-'}</td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                </div>
            </div>
        )}

        {activeTab === 'ra' && (
             <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                    <label htmlFor="ra-module-selector" className="font-semibold mr-4">Módulo:</label>
                    <select id="ra-module-selector" value={activeModuleForRA} onChange={e => setActiveModuleForRA(e.target.value as any)} className="p-2 border rounded-md bg-white shadow-sm">
                        <option value="pc">Productos Culinarios (PC)</option>
                        <option value="optativa">Optativa</option>
                        <option value="proyecto">Proyecto</option>
                    </select>
                </div>
                {Object.values(currentRAs as Record<string, ResultadoAprendizaje>).map((ra) => {
                    const isExpanded = expandedRAs.has(ra.id);
                    const { grade, ponderacionTotal } = calculateRAGrade(ra, student.id, activeModuleForRA, currentCriterios as Record<string, CriterioEvaluacion>, allAcademicGrades, instrumentGrades, allCalculatedGrades);
                    return (
                        <div key={ra.id} className="bg-white shadow-sm rounded-lg overflow-hidden">
                            <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedRAs(p => p.has(ra.id) ? (p.delete(ra.id), new Set(p)) : new Set(p.add(ra.id)))}>
                                {isExpanded ? <ChevronDownIcon className="w-5 h-5 mr-2"/> : <ChevronRightIcon className="w-5 h-5 mr-2"/>}
                                <div className="flex-1 ml-2"><h4 className="font-bold text-gray-800">{ra.nombre}</h4><p className="text-xs text-gray-500">Ponderación evaluada: {ponderacionTotal}%</p></div>
                                <div className="text-right"><p className="text-sm font-medium text-gray-500">Nota RA</p><p className={`text-2xl font-bold ${grade === null ? 'text-gray-400' : grade < 5 ? 'text-red-600' : 'text-green-600'}`}>{grade?.toFixed(2) ?? 'N/E'}</p></div>
                            </div>
                            {isExpanded && (<div className="border-t bg-gray-50 p-4"><h5 className="text-sm font-semibold text-gray-600 mb-2">Desglose de Criterios</h5><div className="space-y-2">{ra.criteriosEvaluacion.map(cId => {const c = currentCriterios[cId]; if(!c) return null; const cGrade = calculateCriterioGrade(c,student.id, activeModuleForRA, allAcademicGrades, instrumentGrades, allCalculatedGrades); return (<div key={c.id} className="flex justify-between p-2 bg-white rounded-md border"><div><p className="text-sm text-gray-800">{c.descripcion}</p></div><div className="text-right flex-shrink-0 ml-4"><p className="text-xs text-gray-500">Pond: {c.ponderacion}%</p><p className={`font-bold ${cGrade === null ? 'text-gray-400' : cGrade < 5 ? 'text-red-500' : 'text-gray-800'}`}>{cGrade?.toFixed(2) ?? 'N/E'}</p></div></div>);})}</div></div>)}
                        </div>
                    )
                })}
            </div>
        )}

        {activeTab === 'servicios' && (
            <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center"><BarChartIcon className="w-6 h-6 mr-2 text-blue-500"/>Rendimiento en Servicios</h3>
                {studentServicesData && studentServicesData.length > 0 ? (
                    <>
                        <CombinedPerformanceChart data={studentServicesData.map(d => ({ name: d.service.name, studentGrade: d.studentGrade, classAverage: d.classAverage }))} />
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100"><tr><th className="p-2 text-left">Servicio</th><th className="p-2">Fecha</th><th className="p-2">Grupo/Agrupación</th><th className="p-2">Nota Ind.</th><th className="p-2">Nota Grupal</th><th className="p-2">Nota Final</th><th className="p-2 text-left">Observaciones</th></tr></thead>
                                <tbody className="[&>tr:nth-child(even)]:bg-gray-50">
                                    {studentServicesData.map(data => (
                                        <tr key={data.service.id}>
                                            <td className="p-2 font-semibold">{data.service.name}</td>
                                            <td className="p-2 text-center">{new Date(data.service.date).toLocaleDateString('es-ES')}</td>
                                            <td className="p-2 text-center">{data.groupName}</td>
                                            <td className="p-2 text-center font-medium">{data.individualGrade.toFixed(2)}</td>
                                            <td className="p-2 text-center font-medium">{data.groupGrade.toFixed(2)}</td>
                                            <td className={`p-2 text-center font-bold ${data.studentGrade < 5 ? 'text-red-600' : 'text-green-600'}`}>{data.studentGrade.toFixed(2)}</td>
                                            <td className="p-2 text-gray-600 max-w-xs truncate" title={data.observations}>{data.observations}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : <p className="text-center text-gray-500 py-8">El alumno no ha participado en ningún servicio evaluado todavía.</p>}
            </div>
        )}
    </div>
  );
};

export default FichaAlumno;

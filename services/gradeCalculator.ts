
import { StudentAcademicGrades, StudentCalculatedGrades, InstrumentGrades, InstrumentoEvaluacion } from '../types';
import { ACADEMIC_EVALUATION_STRUCTURE } from '../data/constants';

const getNumericValue = (g: any): number | null => {
    if (g === null || g === undefined) return null;
    if (typeof g === 'number') return g;
    if (typeof g === 'object') {
        const normal = g.normal !== null && g.normal !== undefined ? parseFloat(String(g.normal)) : null;
        const rec1 = g.rec1 !== null && g.rec1 !== undefined ? parseFloat(String(g.rec1)) : null;
        const rec2 = g.rec2 !== null && g.rec2 !== undefined ? parseFloat(String(g.rec2)) : null;
        const validGrades = [normal, rec1, rec2].filter((v): v is number => v !== null && !isNaN(v));
        return validGrades.length > 0 ? Math.max(...validGrades) : null;
    }
    const parsed = parseFloat(String(g));
    return isNaN(parsed) ? null : parsed;
};

export const calculateStudentPeriodAverages = (
    academicGrades: StudentAcademicGrades | undefined,
    calculatedGrades: StudentCalculatedGrades | undefined,
    studentId?: string,
    instrumentGrades?: InstrumentGrades,
    pcInstrumentosEvaluacion?: Record<string, InstrumentoEvaluacion>
): Record<string, number | null> => {
    const results: { [periodKey: string]: number | null } = {};

    if (!calculatedGrades) {
        ACADEMIC_EVALUATION_STRUCTURE.periods.forEach(period => {
            results[period.key] = null;
        });
        return results;
    }

    ACADEMIC_EVALUATION_STRUCTURE.periods.forEach(period => {
        let totalWeight = 0;
        let weightedSum = 0;
        let hasAnyGrade = false;
        
        period.instruments.forEach(instrument => {
            let grade: number | null = null;
            if (instrument.type === 'manual') {
                if (studentId && instrumentGrades && pcInstrumentosEvaluacion && (instrument.key === 'examen1' || instrument.key === 'examen2')) {
                    const examInstrument = Object.values(pcInstrumentosEvaluacion).find(inst => 
                        inst.nombre?.toLowerCase() === 'examen' || inst.id?.toLowerCase() === 'examen'
                    );
                    if (examInstrument) {
                        const activitiesInPeriod = (examInstrument.activities || []).filter(a => a.trimester === period.key);
                        const activityIndex = instrument.key === 'examen1' ? 0 : 1;
                        const activity = activitiesInPeriod[activityIndex];
                        if (activity) {
                            const g = instrumentGrades[studentId]?.[activity.id];
                            grade = getNumericValue(g);
                        }
                    }
                }
                
                if (grade === null) {
                    const manualGrade = academicGrades?.[period.key]?.manualGrades?.[instrument.key];
                    grade = (manualGrade === null || manualGrade === undefined) ? null : parseFloat(String(manualGrade));
                }
            } else { // calculated
                if (instrument.key === 'servicios') {
                    const periodKey = period.key as 't1' | 't2' | 't3';
                    grade = calculatedGrades.serviceAverages[periodKey] ?? null;
                } else {
                    const examKeyMap: Record<string, keyof StudentCalculatedGrades['practicalExams']> = {
                        'exPracticoT1': 't1', 'exPracticoT2': 't2', 'exPracticoT3': 't3', 'exPracticoRec': 'rec',
                    };
                    const examKey = examKeyMap[instrument.key];
                    if (examKey) {
                        grade = calculatedGrades.practicalExams[examKey] ?? null;
                    }
                }
            }
            if (grade !== null && !isNaN(grade)) {
                hasAnyGrade = true;
            }
            const gradeVal = (grade !== null && !isNaN(grade)) ? grade : 0;
            weightedSum += gradeVal * instrument.weight;
            totalWeight += instrument.weight;
        });
        results[period.key] = hasAnyGrade ? parseFloat((weightedSum / totalWeight).toFixed(2)) : null;
    });

    return results;
};

/**
 * Calculates grades for modules like 'Optativa' or 'Proyecto' based on instrument grades.
 * T1 = Average of all activities in t1
 * T2 = Average of all activities in t2
 * T3 = Average of all activities in t3
 * Final = Average of non-null trimester averages
 */
export const calculateModularGrades = (
    studentId: string,
    instrumentGrades: InstrumentGrades,
    instrumentosEvaluacion: Record<string, InstrumentoEvaluacion>
): { t1: number | null, t2: number | null, t3: number | null, final: number | null } => {
    
    const grades: { t1: number[], t2: number[], t3: number[] } = { t1: [], t2: [], t3: [] };
    const studentGrades = instrumentGrades[studentId] || {};

    Object.values(instrumentosEvaluacion).forEach(instrument => {
        const activities = instrument.activities || [];
        activities.forEach(activity => {
            const rawGrade = studentGrades[activity.id];
            const grade = getNumericValue(rawGrade);
            if (grade !== null && grade !== undefined && !isNaN(grade)) {
                if (activity.trimester === 't1') grades.t1.push(grade);
                else if (activity.trimester === 't2') grades.t2.push(grade);
                else if (activity.trimester === 't3') grades.t3.push(grade);
            }
        });
    });

    const calculateAverage = (values: number[]) => 
        values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

    const avgT1 = calculateAverage(grades.t1);
    const avgT2 = calculateAverage(grades.t2);
    const avgT3 = calculateAverage(grades.t3);
    
    // For Final Grade: Average of the trimester averages that actually have grades
    const validTrimesterAverages = [avgT1, avgT2, avgT3].filter(g => g !== null) as number[];
    const finalAvg = validTrimesterAverages.length > 0 
        ? validTrimesterAverages.reduce((a, b) => a + b, 0) / validTrimesterAverages.length 
        : null;

    return {
        t1: avgT1,
        t2: avgT2,
        t3: avgT3,
        final: finalAvg
    };
};

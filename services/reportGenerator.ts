import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TeacherData, InstituteData, Student, InstrumentGrades, InstrumentoEvaluacion, PracticalExamEvaluation } from '../types';

const PAGE_MARGIN = 15;

const addImageToPdf = (doc: jsPDF, imageData: string | null, x: number, y: number, w: number, h: number) => {
    if (imageData && imageData.startsWith('data:image')) {
        try {
            const imageType = imageData.substring(imageData.indexOf('/') + 1, imageData.indexOf(';'));
            doc.addImage(imageData, imageType.toUpperCase(), x, y, w, h);
        } catch (e) {
            console.error("Error adding image:", e);
        }
    }
};

const drawHeaderAndFooter = (
    doc: jsPDF,
    teacherData: TeacherData,
    instituteData: InstituteData,
    title: string
) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const date = new Date().toLocaleDateString('es-ES');

    // --- HEADER ---
    // Left: Institute Logo + Name
    addImageToPdf(doc, instituteData.logo, PAGE_MARGIN, 10, 15, 15);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80);
    doc.text(instituteData.name || '', PAGE_MARGIN + 18, 18);

    // Right: Teacher Logo + Name
    const teacherLogoX = pageWidth - PAGE_MARGIN - 15;
    addImageToPdf(doc, teacherData.logo, teacherLogoX, 10, 15, 15);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80);
    doc.text(teacherData.name || '', teacherLogoX - 2, 18, { align: 'right' });

    // Center: Title
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40);
    doc.text(title, pageWidth / 2, 30, { align: 'center' });

    // Header Line
    doc.setDrawColor(200).setLineWidth(0.2);
    doc.line(PAGE_MARGIN, 38, pageWidth - PAGE_MARGIN, 38);

    // --- FOOTER ---
    doc.setDrawColor(200).setLineWidth(0.2);
    doc.line(PAGE_MARGIN, pageHeight - 15, pageWidth - PAGE_MARGIN, pageHeight - 15);
    
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(100);
    // Left: Institute - Teacher
    doc.text(`${instituteData.name} - ${teacherData.name}`, PAGE_MARGIN, pageHeight - 10);
    // Center: Page X
    const pageNumber = (doc as any).internal.getNumberOfPages();
    doc.text(`Página ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    // Right: Date
    doc.text(date, pageWidth - PAGE_MARGIN, pageHeight - 10, { align: 'right' });
};

export const generateAcademicReportPDF = (
    students: Student[],
    gradings: any, // Structure based on GestionAcademica calculations
    teacherData: TeacherData,
    instituteData: InstituteData,
    title: string = "Gestión Académica - Principal"
) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape as per the table requirements
    
    const didDrawPage = (data: any) => {
        drawHeaderAndFooter(doc, teacherData, instituteData, title);
    };

    // Body data construction
    const body = students.map(student => {
        const studentGrades = gradings.studentGrades?.[student.id] || {};
        const averages = studentGrades.averages || {};
        
        return [
            `${student.apellido1} ${student.apellido2}, ${student.nombre}`,
            // 1º Trimestre
            studentGrades.t1_ex1?.toFixed(2) || '-',
            studentGrades.t1_ex2?.toFixed(2) || '-',
            studentGrades.t1_serv?.toFixed(2) || '-',
            studentGrades.t1_prac?.toFixed(2) || '-',
            averages.t1?.toFixed(2) || '-',
            // 2º Trimestre
            studentGrades.t2_ex1?.toFixed(2) || '-',
            studentGrades.t2_ex2?.toFixed(2) || '-',
            studentGrades.t2_serv?.toFixed(2) || '-',
            studentGrades.t2_prac?.toFixed(2) || '-',
            averages.t2?.toFixed(2) || '-',
            // Recuperación
            studentGrades.rec_ex?.toFixed(2) || '-',
            studentGrades.rec_prac?.toFixed(2) || '-',
            averages.final?.toFixed(2) || '-'
        ];
    });

    autoTable(doc, {
        startY: 42,
        margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [
            [
                { content: 'Alumno', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
                { content: '1º Trimestre', colSpan: 5, styles: { halign: 'center' } },
                { content: '2º Trimestre', colSpan: 5, styles: { halign: 'center' } },
                { content: 'Recuperación', colSpan: 3, styles: { halign: 'center' } }
            ],
            [
                'Examen 1 (12.5%)', 'Examen 2 (12.5%)', 'Servicios (15%)', 'Ex. Práctico (10%)', 'MEDIA',
                'Examen 1 (12.5%)', 'Examen 2 (12.5%)', 'Servicios (15%)', 'Ex. Práctico (10%)', 'MEDIA',
                'Examen REC (50%)', 'Ex. Práctico REC (50%)', 'MEDIA'
            ]
        ],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 244, 248], textColor: 50, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 50 },
            5: { fontStyle: 'bold', fillColor: [245, 245, 245] },
            10: { fontStyle: 'bold', fillColor: [245, 245, 245] },
            13: { fontStyle: 'bold', fillColor: [235, 235, 235] }
        },
        didDrawPage: didDrawPage
    });

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateExamSchedulePDF = (
    examDate: string,
    scheduledStudents: { student: Student; entry: string; exit: string }[],
    teacherData: TeacherData,
    instituteData: InstituteData
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `Horario de Examen Práctico - ${examDate}`;
    
    const body = scheduledStudents.map((s, index) => [
        index + 1,
        s.entry,
        s.exit,
        `${s.student.apellido1} ${s.student.apellido2}, ${s.student.nombre}`
    ]);

    autoTable(doc, {
        startY: 42,
        margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [['Orden', 'Hora Inicio', 'Hora Final', 'Nombre Alumno']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 244, 248], textColor: 50, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 10, cellPadding: 3, halign: 'center' },
        columnStyles: { 3: { halign: 'left' } },
        didDrawPage: () => {
            drawHeaderAndFooter(doc, teacherData, instituteData, title);
        }
    });

    doc.save(`Horario_Examen_${examDate}.pdf`);
};

export const generateEntryExitPDF = (
    date: string,
    type: string,
    reason: string,
    studentNames: string[],
    teacherData: TeacherData,
    instituteData: InstituteData
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const title = `Hoja de Registro: ${type}`;
    
    doc.setFontSize(12).setFont('helvetica', 'bold').text(`Fecha: ${date}`, PAGE_MARGIN, 45);
    doc.setFontSize(12).setFont('helvetica', 'bold').text(`Motivo:`, PAGE_MARGIN, 52);
    doc.setFontSize(12).setFont('helvetica', 'normal').text(reason, PAGE_MARGIN + 18, 52, { maxWidth: 160 });

    autoTable(doc, {
        startY: 65,
        margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [['Nº', 'Nombre del Alumno', 'Firma']],
        body: studentNames.map((name, i) => [i + 1, name, '']),
        theme: 'grid',
        headStyles: { fillColor: [240, 244, 248], textColor: 50, fontStyle: 'bold' },
        styles: { cellPadding: 5, minCellHeight: 15 },
        didDrawPage: () => {
            drawHeaderAndFooter(doc, teacherData, instituteData, title);
        }
    });

    doc.save(`Registro_${type.replace(/\s+/g, '_')}_${date}.pdf`);
};

export const generateStudentFilePDF = (
    student: Student,
    calculatedGrades: any,
    academicGrades: any,
    servicesData: any[],
    instrumentGrades: InstrumentGrades,
    pcInstrumentosEvaluacion: Record<string, InstrumentoEvaluacion>,
    practicalExamEvaluations: PracticalExamEvaluation[],
    teacherData: TeacherData,
    instituteData: InstituteData
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const title = `Ficha de Alumno: ${student.nombre} ${student.apellido1}`;
    
    const fullName = `${student.apellido1} ${student.apellido2}, ${student.nombre}`;
    
    const drawPageHeader = () => {
        drawHeaderAndFooter(doc, teacherData, instituteData, title);
    };

    drawPageHeader();

    // --- STUDENT INFO ---
    doc.setFontSize(12).setFont('helvetica', 'bold').text('Datos del Alumno', PAGE_MARGIN, 45);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(50);
    doc.text(`Nombre: ${fullName}`, PAGE_MARGIN, 52);
    doc.text(`NRE: ${student.nre || 'N/A'}`, PAGE_MARGIN, 57);
    doc.text(`Grupo: ${student.grupo || 'N/A'}`, PAGE_MARGIN, 62);
    doc.text(`Email: ${student.emailOficial || student.emailPersonal || 'N/A'}`, PAGE_MARGIN, 67);

    // --- SUMMARY GRADES ---
    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(0).text('Resumen de Calificaciones (PC)', PAGE_MARGIN, 77);
    
    const summaryBody = [
        ['1º Trimestre', calculatedGrades?.serviceAverages?.t1?.toFixed(2) || '-', calculatedGrades?.practicalExams?.t1?.toFixed(2) || '-', academicGrades?.t1?.manualGrades?.media?.toFixed(2) || '-'],
        ['2º Trimestre', calculatedGrades?.serviceAverages?.t2?.toFixed(2) || '-', calculatedGrades?.practicalExams?.t2?.toFixed(2) || '-', academicGrades?.t2?.manualGrades?.media?.toFixed(2) || '-'],
        ['Nota Final', '-', '-', academicGrades?.final?.manualGrades?.media?.toFixed(2) || '-']
    ];

    autoTable(doc, {
        startY: 80,
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: [['Periodo', 'Media Servicios', 'Media Práctico', 'Media Final']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70] },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- DETAILED EXAMS (TEÓRICO) ---
    doc.setFontSize(12).setFont('helvetica', 'bold').text('Detalle de Exámenes (Teórico PC)', PAGE_MARGIN, currentY);
    
    const examInstrument = Object.values(pcInstrumentosEvaluacion).find(inst => 
        inst.nombre?.toLowerCase() === 'examen' || inst.id?.toLowerCase() === 'examen'
    );

    if (examInstrument && examInstrument.activities) {
        const examRows: any[] = [];
        ['t1', 't2', 't3'].forEach(tri => {
            const activities = examInstrument.activities.filter(a => a.trimester === tri);
            activities.forEach(act => {
                const grade = instrumentGrades[student.id]?.[act.id];
                const g = typeof grade === 'object' && grade !== null ? grade : { normal: typeof grade === 'number' ? grade : null, rec1: null, rec2: null };
                const final = Math.max(g.normal ?? 0, g.rec1 ?? 0, g.rec2 ?? 0);
                examRows.push([
                    tri.toUpperCase(),
                    act.name,
                    g.normal?.toFixed(2) || '-',
                    g.rec1?.toFixed(2) || '-',
                    g.rec2?.toFixed(2) || '-',
                    final > 0 ? final.toFixed(2) : '-'
                ]);
            });
        });

        autoTable(doc, {
            startY: currentY + 3,
            margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
            head: [['Trim', 'Actividad', 'Normal', 'Rec 1', 'Rec 2', 'Final']],
            body: examRows,
            theme: 'grid',
            headStyles: { fillColor: [100, 100, 100] },
            didDrawPage: drawPageHeader
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- DETAILED SERVICES ---
    if (currentY > 250) { doc.addPage(); currentY = 45; }
    doc.setFontSize(12).setFont('helvetica', 'bold').text('Detalle de Servicios (PC)', PAGE_MARGIN, currentY);

    if (servicesData && servicesData.length > 0) {
        const servicesRows = servicesData.map(s => [
            s.service.trimester.toUpperCase(),
            s.service.name,
            new Date(s.service.date).toLocaleDateString('es-ES'),
            s.individualGrade.toFixed(2),
            s.groupGrade.toFixed(2),
            s.studentGrade.toFixed(2)
        ]);

        autoTable(doc, {
            startY: currentY + 3,
            margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
            head: [['Trim', 'Servicio', 'Fecha', 'Nota Ind.', 'Nota Grp.', 'Nota Final']],
            body: servicesRows,
            theme: 'grid',
            headStyles: { fillColor: [44, 62, 80] },
            didDrawPage: drawPageHeader
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- PRACTICAL EXAMS detalle ---
    if (currentY > 250) { doc.addPage(); currentY = 45; }
    doc.setFontSize(12).setFont('helvetica', 'bold').text('Exámenes Prácticos', PAGE_MARGIN, currentY);
    
    const studentEvals = practicalExamEvaluations.filter(e => e.studentId === student.id);
    if (studentEvals.length > 0) {
        const practicalRows = studentEvals.map(ev => [
            ev.examPeriod.toUpperCase(),
            ev.finalScore?.toFixed(2) || '-'
        ]);

        autoTable(doc, {
            startY: currentY + 3,
            margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
            head: [['Periodo', 'Calificación']],
            body: practicalRows,
            theme: 'grid',
            headStyles: { fillColor: [142, 68, 173] },
            didDrawPage: drawPageHeader
        });
    } else {
        doc.setFontSize(10).setFont('helvetica', 'italic').text('No hay exámenes prácticos registrados.', PAGE_MARGIN, currentY + 8);
    }

    doc.save(`Ficha_${student.apellido1}_${student.nombre}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateGenericTablePDF = (
    title: string,
    headers: any[][],
    body: any[][],
    teacherData: TeacherData,
    instituteData: InstituteData
) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    autoTable(doc, {
        startY: 42,
        margin: { top: 42, left: PAGE_MARGIN, right: PAGE_MARGIN },
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 244, 248], textColor: 50, fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        didDrawPage: (data) => {
            drawHeaderAndFooter(doc, teacherData, instituteData, title);
        }
    });

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

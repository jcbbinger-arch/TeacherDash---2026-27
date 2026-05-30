import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TeacherData, InstituteData, Student } from '../types';

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

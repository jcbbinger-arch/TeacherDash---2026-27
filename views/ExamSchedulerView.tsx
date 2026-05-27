import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Student, TeacherData, InstituteData } from '../types';
import { ClockIcon, SearchIcon, ArrowRightIcon, FileTextIcon } from '../components/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to add image to PDF
const addImageToPdf = (doc: jsPDF, imageData: string | null, x: number, y: number, w: number, h: number) => {
    if (imageData && imageData.startsWith('data:image')) {
        try {
            const imageType = imageData.substring(imageData.indexOf('/') + 1, imageData.indexOf(';'));
            doc.addImage(imageData, imageType.toUpperCase(), x, y, w, h);
        } catch (e) { console.error("Error adding image:", e); }
    }
};

const PAGE_MARGIN = 15;

const ExamSchedulerView: React.FC = () => {
    const { students, teacherData, instituteData } = useAppContext();
    
    const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('08:30');
    const [examDuration, setExamDuration] = useState(120); // minutes
    const [interval, setInterval] = useState(15); // minutes
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

    const filteredStudents = useMemo(() => {
        return students
            .filter(s => 
                !selectedStudentIds.includes(s.id) &&
                (`${s.nombre} ${s.apellido1} ${s.apellido2}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 s.grupo.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => a.apellido1.localeCompare(b.apellido1));
    }, [students, searchTerm, selectedStudentIds]);

    const scheduledStudents = useMemo(() => {
        return selectedStudentIds
            .map(id => students.find(s => s.id === id))
            .filter((s): s is Student => !!s);
    }, [selectedStudentIds, students]);

    const calculateTimes = (index: number) => {
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const totalStartMinutes = startHour * 60 + startMinute + (index * interval);
        
        const entryDate = new Date();
        entryDate.setHours(Math.floor(totalStartMinutes / 60));
        entryDate.setMinutes(totalStartMinutes % 60);
        
        const exitDate = new Date(entryDate.getTime() + examDuration * 60000);
        
        return {
            entry: entryDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            exit: exitDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const handleAddStudent = (id: string) => {
        setSelectedStudentIds(prev => [...prev, id]);
    };

    const handleRemoveStudent = (id: string) => {
        setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newIds = [...selectedStudentIds];
        [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
        setSelectedStudentIds(newIds);
    };

    const handleMoveDown = (index: number) => {
        if (index === selectedStudentIds.length - 1) return;
        const newIds = [...selectedStudentIds];
        [newIds[index + 1], newIds[index]] = [newIds[index], newIds[index + 1]];
        setSelectedStudentIds(newIds);
    };

    const generatePDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const formattedDate = new Date(examDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        // Header
        addImageToPdf(doc, instituteData.logo, PAGE_MARGIN, 10, 20, 20);
        
        doc.setFontSize(18).setFont('helvetica', 'bold');
        doc.text('Hoja de Examen Práctico', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`Día ${formattedDate}`, pageWidth / 2, 28, { align: 'center' });

        // Split students into two columns for PDF layout if many students
        const midpoint = Math.ceil(scheduledStudents.length / 2);
        const col1 = scheduledStudents.slice(0, midpoint);
        const col2 = scheduledStudents.slice(midpoint);

        const tableHeaders = [['Orden', 'Hora Inicio', 'Hora Final', 'Nombre Alumno']];
        
        const getBody = (studentsList: Student[], startIndex: number) => studentsList.map((s, i) => {
            const times = calculateTimes(startIndex + i);
            return [startIndex + i + 1, times.entry, times.exit, `${s.apellido1} ${s.apellido2}, ${s.nombre}`];
        });

        // Left Table
        autoTable(doc, {
            startY: 40,
            head: tableHeaders,
            body: getBody(col1, 0),
            theme: 'grid',
            headStyles: { fillColor: [255, 228, 196], textColor: 0, fontStyle: 'bold' }, // Bisque color roughly matches mock
            styles: { fontSize: 10, cellPadding: 2, halign: 'center' },
            columnStyles: { 3: { halign: 'left' } },
            tableWidth: (pageWidth - (PAGE_MARGIN * 2)) / 2 - 5,
            margin: { left: PAGE_MARGIN }
        });

        // Right Table
        if (col2.length > 0) {
            autoTable(doc, {
                startY: 40,
                head: tableHeaders,
                body: getBody(col2, midpoint),
                theme: 'grid',
                headStyles: { fillColor: [216, 191, 216], textColor: 0, fontStyle: 'bold' }, // Thistle color roughly matches mock
                styles: { fontSize: 10, cellPadding: 2, halign: 'center' },
                columnStyles: { 3: { halign: 'left' } },
                tableWidth: (pageWidth - (PAGE_MARGIN * 2)) / 2 - 5,
                margin: { left: pageWidth / 2 + 5 }
            });
        }

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8).setTextColor(100);
        doc.text(`${teacherData.name} - ${instituteData.name}`, PAGE_MARGIN, pageHeight - 10);

        doc.save(`Horario_Examen_${examDate}.pdf`);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <ClockIcon className="w-8 h-8 mr-3 text-blue-500" />
                        Planificador de Exámenes
                    </h1>
                    <p className="text-gray-500 mt-1">Genera horarios escalonados para exámenes prácticos.</p>
                </div>
                <button onClick={generatePDF} disabled={scheduledStudents.length === 0} className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed">
                    <FileTextIcon className="w-5 h-5 mr-2" />
                    Exportar PDF
                </button>
            </header>

            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Examen</label>
                    <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio (1er alumno)</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración Examen (min)</label>
                    <input type="number" value={examDuration} onChange={e => setExamDuration(parseInt(e.target.value) || 0)} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo Escalonado (min)</label>
                    <input type="number" value={interval} onChange={e => setInterval(parseInt(e.target.value) || 0)} className="w-full p-2 border rounded-md" />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Students Selection */}
                <div className="bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-700 mb-2">Seleccionar Alumnos</h3>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 p-2 text-sm border rounded-md"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredStudents.map(student => (
                            <button 
                                key={student.id}
                                onClick={() => handleAddStudent(student.id)}
                                className="w-full text-left flex items-center justify-between p-2 hover:bg-blue-50 rounded-md group"
                            >
                                <div className="flex items-center">
                                    <img src={student.fotoUrl} alt="" className="w-8 h-8 rounded-full mr-3 object-cover"/>
                                    <div>
                                        <p className="text-sm font-medium">{student.apellido1} {student.apellido2}, {student.nombre}</p>
                                        <p className="text-xs text-gray-500">{student.grupo}</p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Planificación ({scheduledStudents.length} alumnos)</h3>
                        <button onClick={() => setSelectedStudentIds([])} className="text-xs text-red-600 hover:underline">Limpiar Lista</button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-center w-16">Orden</th>
                                    <th className="px-4 py-2 text-center w-24">Entrada</th>
                                    <th className="px-4 py-2 text-center w-24">Salida</th>
                                    <th className="px-4 py-2 text-left">Alumno</th>
                                    <th className="px-4 py-2 w-20">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {scheduledStudents.map((student, index) => {
                                    const times = calculateTimes(index);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-center font-bold text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-3 text-center font-mono text-blue-600 font-medium">{times.entry}</td>
                                            <td className="px-4 py-3 text-center font-mono text-gray-600">{times.exit}</td>
                                            <td className="px-4 py-3 font-medium">{student.apellido1} {student.apellido2}, {student.nombre}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center space-x-1">
                                                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">↑</button>
                                                    <button onClick={() => handleMoveDown(index)} disabled={index === scheduledStudents.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">↓</button>
                                                    <button onClick={() => handleRemoveStudent(student.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">×</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {scheduledStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                                            Añade alumnos desde la lista izquierda para generar el horario.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamSchedulerView;
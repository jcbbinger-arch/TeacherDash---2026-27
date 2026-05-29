import { ExportIcon } from './icons';

interface ExportButtonsProps {
    onExportPdf: () => void;
    onExportExcel: () => void;
}

export const ExportButtons = ({ onExportPdf, onExportExcel }: ExportButtonsProps) => (
    <div className="flex items-center space-x-2">
        <button onClick={onExportPdf} className="flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium">
             PDF
        </button>
        <button onClick={onExportExcel} className="flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium">
             Excel
        </button>
    </div>
);

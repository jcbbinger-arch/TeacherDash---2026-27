import React from 'react';

const ActionCard: React.FC<{ icon: React.ElementType, title: string, description: string, onClick: () => void, color: string }> = ({ icon: Icon, title, description, onClick, color }) => (
    <button onClick={onClick} className="bg-white p-6 rounded-xl shadow-md text-left w-full h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                <Icon className="w-8 h-8" style={{ color: color }} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
        </div>
    </button>
);

export default ActionCard;

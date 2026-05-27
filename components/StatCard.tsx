import React from 'react';

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string }> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-4 border-l-4" style={{ borderColor: color }}>
        <div className="flex-shrink-0">
            <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
                <Icon className="w-6 h-6" style={{ color: color }} />
            </div>
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

export default StatCard;

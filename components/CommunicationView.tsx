'use client';

import React from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { Employee } from '@/types';

interface CommunicationViewProps {
  employees: Employee[];
  onRate: (employee: Employee, rating: number) => void;
}

function ratingLabel(r: number): { text: string; cls: string } {
  if (r >= 5) return { text: 'Excellent', cls: 'text-green-600 bg-green-50' };
  if (r >= 4) return { text: 'Good', cls: 'text-accent-700 bg-accent-50' };
  if (r >= 3) return { text: 'Average', cls: 'text-amber-600 bg-amber-50' };
  if (r >= 1) return { text: 'Needs Work', cls: 'text-red-500 bg-red-50' };
  return { text: 'Unrated', cls: 'text-gray-400 bg-[#EAE1CC]' };
}

export function CommunicationView({ employees, onRate }: CommunicationViewProps) {
  const active = employees.filter(e => e.status !== 'Offboarded');
  const rated = active.filter(e => e.communicationRating);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.communicationRating || 0), 0) / rated.length : 0;

  return (
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-display flex items-center gap-2">
            <MessageSquare size={18} className="text-accent-600" />
            Communication Performance
          </h2>
          <p className="text-gray-400 text-xs">
            Track and rate how clearly and effectively each employee communicates across the team.
          </p>
        </div>
        <span className="text-[11px] font-mono text-gray-500 bg-[#EAE1CC] px-2.5 py-1 rounded-md w-fit">
          Team avg <span className="font-bold text-gray-900">{avg.toFixed(1)}</span>/5 · {rated.length}/{active.length} rated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map(emp => {
          const rating = emp.communicationRating || 0;
          const label = ratingLabel(rating);
          return (
            <div key={emp.id} className="bg-[#FFFFFF] border border-[#E1D6BC] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{emp.fullName}</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {emp.role} · {emp.department}
                  </p>
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${label.cls}`}>
                  {label.text}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => onRate(emp, n)}
                    title={`Rate ${n}/5`}
                    className="cursor-pointer transition hover:scale-110"
                  >
                    <Star
                      size={20}
                      className={n <= rating ? 'fill-accent-500 text-accent-500' : 'text-gray-300'}
                    />
                  </button>
                ))}
                <span className="ml-1 text-[11px] font-mono text-gray-400">
                  {rating ? `${rating}/5` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CommunicationView;

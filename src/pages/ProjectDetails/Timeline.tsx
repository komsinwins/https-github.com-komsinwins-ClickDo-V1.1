import { useAppStore } from '../../store';
import { differenceInDays, parseISO, addDays, format, isValid } from 'date-fns';

export function Timeline({ projectId }: { projectId: string }) {
  const { data } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  const scopes = data.scopes.filter(s => s.projectId === projectId);

  if (!project) return null;

  // Find min start date and max end date to define chart width
  let minDate = new Date();
  let maxDate = new Date();
  let hasValidDates = false;

  scopes.forEach(scope => {
    if (scope.baselineStartDate && isValid(parseISO(scope.baselineStartDate))) {
      const d = parseISO(scope.baselineStartDate);
      if (!hasValidDates || d < minDate) minDate = d;
      hasValidDates = true;
    }
    if (scope.baselineEndDate && isValid(parseISO(scope.baselineEndDate))) {
      const d = parseISO(scope.baselineEndDate);
      if (!hasValidDates || d > maxDate) maxDate = d;
      hasValidDates = true;
    }
    if (scope.actualStartDate && isValid(parseISO(scope.actualStartDate))) {
      const d = parseISO(scope.actualStartDate);
      if (!hasValidDates || d < minDate) minDate = d;
    }
    if (scope.actualEndDate && isValid(parseISO(scope.actualEndDate))) {
      const d = parseISO(scope.actualEndDate);
      if (!hasValidDates || d > maxDate) maxDate = d;
    }
  });

  if (!hasValidDates) {
    return <div className="text-center p-8 text-slate-500">{lang === 'th' ? 'กรุณากำหนดวันที่ในขอบเขตงานเพื่อดูไทม์ไลน์' : 'Please set dates in Scope of Work to view Timeline.'}</div>;
  }

  // Add some padding to dates
  minDate = addDays(minDate, -2);
  maxDate = addDays(maxDate, 2);
  const totalDays = differenceInDays(maxDate, minDate);
  const dayWidth = 40; // px per day

  const generateDays = () => {
    const days = [];
    for (let i = 0; i <= totalDays; i++) {
      days.push(addDays(minDate, i));
    }
    return days;
  };

  const days = generateDays();

  return (
    <div className="overflow-x-auto pb-4 border border-slate-200 rounded">
      <div className="inline-block min-w-full">
        {/* Header */}
        <div className="flex border-b border-slate-200 bg-[#F1F5F9] sticky top-0 z-10">
          <div className="w-48 flex-shrink-0 p-2 font-semibold text-xs text-slate-700 border-r border-slate-200 sticky left-0 bg-[#F1F5F9] z-20">
            {lang === 'th' ? 'ชื่องาน' : 'Task Name'}
          </div>
          <div className="flex relative" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
            {days.map((day, i) => (
              <div 
                key={i} 
                className="absolute top-0 bottom-0 border-r border-slate-200 text-[10px] text-slate-500 p-1 truncate text-center font-medium"
                style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px`, height: '100%' }}
              >
                {format(day, 'dd/MM')}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {scopes.map(scope => {
          // Baseline calculations
          let baselineLeft = 0;
          let baselineWidth = 0;
          if (scope.baselineStartDate && scope.baselineEndDate && isValid(parseISO(scope.baselineStartDate)) && isValid(parseISO(scope.baselineEndDate))) {
            baselineLeft = differenceInDays(parseISO(scope.baselineStartDate), minDate) * dayWidth;
            baselineWidth = (differenceInDays(parseISO(scope.baselineEndDate), parseISO(scope.baselineStartDate)) + 1) * dayWidth;
          }

          // Actual calculations
          let actualLeft = 0;
          let actualWidth = 0;
          if (scope.actualStartDate && isValid(parseISO(scope.actualStartDate))) {
            const actEnd = scope.actualEndDate && isValid(parseISO(scope.actualEndDate)) 
              ? parseISO(scope.actualEndDate) 
              : new Date(); // If not ended, use today or baseline end? Let's use today if started.
            
            actualLeft = differenceInDays(parseISO(scope.actualStartDate), minDate) * dayWidth;
            actualWidth = (differenceInDays(actEnd, parseISO(scope.actualStartDate)) + 1) * dayWidth;
          }

          return (
            <div key={scope.id} className="flex border-b border-slate-100 hover:bg-slate-50 relative group">
              <div className="w-48 flex-shrink-0 p-2 font-medium text-xs text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-20 truncate">
                {scope.taskName}
                <div className="text-[10px] text-slate-400 mt-0.5">{lang === 'th' ? `ความคืบหน้า ${scope.progress}%` : `${scope.progress}% Complete`}</div>
              </div>
              <div className="flex relative py-2" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
                {/* Grid lines */}
                {days.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100 pointer-events-none" style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px` }} />
                ))}
                
                {/* Baseline Bar */}
                {baselineWidth > 0 && (
                  <div 
                    className="absolute top-2 h-1.5 bg-[#94A3B8] rounded-full"
                    style={{ left: `${baselineLeft}px`, width: `${baselineWidth}px` }}
                    title={`${lang === 'th' ? 'แผน:' : 'Baseline:'} ${scope.baselineStartDate} - ${scope.baselineEndDate}`}
                  />
                )}
                
                {/* Actual Bar */}
                {actualWidth > 0 && (
                  <div 
                    className="absolute top-4 h-2 bg-[#E2E8F0] rounded-full overflow-hidden"
                    style={{ left: `${actualLeft}px`, width: `${actualWidth}px` }}
                    title={`${lang === 'th' ? 'จริง:' : 'Actual:'} ${scope.actualStartDate} - ${scope.actualEndDate || (lang === 'th' ? 'กำลังดำเนินการ' : 'Ongoing')} (${scope.progress}%)`}
                  >
                    <div 
                      className={`h-full ${scope.progress === 100 ? 'bg-[#22C55E]' : 'bg-[#0061FF]'}`} 
                      style={{ width: `${scope.progress}%` }} 
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-3 flex gap-4 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 mt-2 rounded-b">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-[#94A3B8] rounded-full"></div>
          <span>{lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-[#0061FF] rounded-full"></div>
          <span>{lang === 'th' ? 'กำลังดำเนินการ' : 'In Progress'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 bg-[#22C55E] rounded-full"></div>
          <span>{lang === 'th' ? 'เสร็จสมบูรณ์' : 'Completed'}</span>
        </div>
      </div>
    </div>
  );
}

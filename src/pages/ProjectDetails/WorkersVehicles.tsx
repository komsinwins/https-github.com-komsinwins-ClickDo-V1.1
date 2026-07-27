import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Download } from 'lucide-react';
import { Worker, Vehicle } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export function WorkersVehicles({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);

  const workers = data.workers.filter(w => w.projectId === projectId);
  const vehicles = data.vehicles.filter(v => v.projectId === projectId);

  const addWorker = () => {
    const newWorker: Worker = { id: uuidv4(), projectId, firstName: '', lastName: '', phone: '' };
    updateData({ workers: [...data.workers, newWorker] });
  };

  const updateWorker = (id: string, field: string, value: string) => {
    updateData({ workers: data.workers.map(w => w.id === id ? { ...w, [field]: value } : w) });
  };

  const deleteWorker = (id: string) => {
    updateData({ workers: data.workers.filter(w => w.id !== id) });
  };

  const addVehicle = () => {
    const newVehicle: Vehicle = { id: uuidv4(), projectId, type: '', licensePlate: '', model: '', brand: '', color: '' };
    updateData({ vehicles: [...data.vehicles, newVehicle] });
  };

  const updateVehicle = (id: string, field: string, value: string) => {
    updateData({ vehicles: data.vehicles.map(v => v.id === id ? { ...v, [field]: value } : v) });
  };

  const deleteVehicle = (id: string) => {
    updateData({ vehicles: data.vehicles.filter(v => v.id !== id) });
  };

  const exportPDF = async () => {
    const element = document.getElementById('export-container');
    if (!element) return;
    
    // Temporarily hide buttons for export
    const buttons = element.querySelectorAll('button');
    buttons.forEach(b => b.style.display = 'none');
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    buttons.forEach(b => b.style.display = '');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Workers_Vehicles_${project?.name || 'Project'}.pdf`);
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-end mb-4">
        <button
          onClick={exportPDF}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          {lang === 'th' ? 'ส่งออก PDF' : 'Export PDF'}
        </button>
      </div>

      <div id="export-container" className="space-y-8 bg-white p-2">
        <div className="text-center mb-6 hidden print:block">
          <h2 className="text-2xl font-bold">{lang === 'th' ? 'บันทึกคนงานและยานพาหนะ' : 'Workers & Vehicles Log'}</h2>
          <p className="text-slate-500">{lang === 'th' ? 'โครงการ:' : 'Project:'} {project?.name}</p>
        </div>

        {/* Workers Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{lang === 'th' ? 'รายชื่อคนงาน' : 'Workers'}</h3>
            <button onClick={addWorker} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-medium">{lang === 'th' ? 'ชื่อ' : 'First Name'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'นามสกุล' : 'Last Name'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'เบอร์โทรศัพท์ (ไม่บังคับ)' : 'Phone (Optional)'}</th>
                <th className="p-3 font-medium text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-slate-500">{lang === 'th' ? 'ไม่มีข้อมูลคนงาน' : 'No workers added.'}</td></tr>
              ) : workers.map(w => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="p-2"><input type="text" value={w.firstName} onChange={e => updateWorker(w.id, 'firstName', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'ชื่อ' : 'First Name'}/></td>
                  <td className="p-2"><input type="text" value={w.lastName} onChange={e => updateWorker(w.id, 'lastName', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'นามสกุล' : 'Last Name'}/></td>
                  <td className="p-2"><input type="text" value={w.phone || ''} onChange={e => updateWorker(w.id, 'phone', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}/></td>
                  <td className="p-2 text-right">
                    <button onClick={() => deleteWorker(w.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vehicles Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{lang === 'th' ? 'ยานพาหนะ' : 'Vehicles'}</h3>
            <button onClick={addVehicle} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-medium">{lang === 'th' ? 'ประเภท' : 'Type'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'ทะเบียนรถ & จังหวัด' : 'License Plate & Prov.'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'ยี่ห้อ' : 'Brand'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'รุ่น' : 'Model'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'สี' : 'Color'}</th>
                <th className="p-3 font-medium text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">{lang === 'th' ? 'ไม่มีข้อมูลยานพาหนะ' : 'No vehicles added.'}</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-2"><input type="text" value={v.type} onChange={e => updateVehicle(v.id, 'type', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'กระบะ' : 'Pickup'}/></td>
                  <td className="p-2"><input type="text" value={v.licensePlate} onChange={e => updateVehicle(v.id, 'licensePlate', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? '1กข 1234 กทม' : '1กข 1234 BKK'}/></td>
                  <td className="p-2"><input type="text" value={v.brand} onChange={e => updateVehicle(v.id, 'brand', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'โตโยต้า' : 'Toyota'}/></td>
                  <td className="p-2"><input type="text" value={v.model} onChange={e => updateVehicle(v.id, 'model', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'ไฮลักซ์' : 'Hilux'}/></td>
                  <td className="p-2"><input type="text" value={v.color} onChange={e => updateVehicle(v.id, 'color', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'ขาว' : 'White'}/></td>
                  <td className="p-2 text-right">
                    <button onClick={() => deleteVehicle(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

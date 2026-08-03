import React, { useRef } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { FileText, Trash2, Download, Upload } from 'lucide-react';
import { SaveButton } from '../../components/SaveButton';

export function Files({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const files = data.files.filter(f => f.projectId === projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file: File) => {
        return new Promise<any>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve({
            id: uuidv4(),
            projectId,
            name: file.name,
            url: ev.target?.result as string,
            uploadedAt: new Date().toISOString()
          });
          reader.readAsDataURL(file);
        });
      });
      Promise.all(newFiles).then(results => updateData({ files: [...data.files, ...results] }));
    }
  };

  const deleteFile = (id: string) => {
    updateData({ files: data.files.filter(f => f.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'ไฟล์สำคัญ' : 'Important Files'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'อัปโหลดและจัดเก็บเอกสาร แบบแปลน และไฟล์สำคัญของโครงการ' : 'Upload and organize project documents, drawings, and files.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4" />
            {lang === 'th' ? 'อัปโหลดไฟล์' : 'Upload Files'}
          </button>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกรายการไฟล์เรียบร้อยแล้ว' : 'Files saved successfully'} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {files.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {lang === 'th' ? 'ยังไม่ได้อัปโหลดไฟล์' : 'No files uploaded yet.'}
          </div>
        ) : (
          files.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(file.uploadedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col gap-1">
                <a href={file.url} download={file.name} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => deleteFile(file.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

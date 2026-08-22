import React, { useState, useEffect } from 'react';
import { Download, FileText, FileArchive, FileSpreadsheet as FileSpreadsheetIcon, FolderOpen } from 'lucide-react';
import { MaterialItem } from '../types';
import { MATERIAL_TYPES } from '../data/coursesData';
import { subscribeMaterialsFromFirestore } from '../lib/firestoreService';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'exe'].includes(ext)) return FileArchive;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheetIcon;
  return FileText;
}

export const MaterialsSection: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('전체');

  useEffect(() => {
    const unsub = subscribeMaterialsFromFirestore((data) => {
      setMaterials(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = materials.filter((m) => {
    return selectedType === '전체' || m.materialType === selectedType;
  });


  return (
    <section id="materials" className="py-12 lg:py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-100/80 backdrop-blur-sm text-blue-700 font-extrabold text-xs mb-3 border border-blue-200/60 shadow-sm">
            <FolderOpen className="w-3.5 h-3.5" />
            자료실
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            서식 · 예제 · 프로그램 다운로드
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            수강생을 위한 각종 서식, 과정별 예제 파일, 채점프로그램을 내려받으실 수 있습니다.
          </p>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8">
          <span className="text-xs font-bold text-slate-500 shrink-0">유형</span>
          {['전체', ...MATERIAL_TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === t
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white/60 backdrop-blur-md text-slate-700 border border-white/80 hover:bg-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl overflow-hidden divide-y divide-white/60">
          {isLoading ? (
            <div className="divide-y divide-white/60">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 sm:p-6 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/80 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-slate-200/80" />
                    <div className="h-3 w-1/3 rounded bg-slate-200/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              조건에 맞는 자료가 없습니다.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = getFileIcon(item.fileName);
              return (
                <a
                  key={item.id}
                  href={item.fileURL}
                  download={item.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 sm:p-6 hover:bg-white/60 transition-colors flex items-center gap-4 group"
                >
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors truncate">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {item.materialType} · {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                  <div className="shrink-0 p-2.5 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-500 group-hover:text-white transition-all">
                    <Download className="w-4 h-4" />
                  </div>
                </a>
              );
            })
          )}
        </div>

      </div>
    </section>
  );
};

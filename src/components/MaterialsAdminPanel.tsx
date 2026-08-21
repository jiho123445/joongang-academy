import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  FileSpreadsheet as FileSpreadsheetIcon,
} from 'lucide-react';
import { MaterialItem } from '../types';
import { MATERIAL_COURSE_CATEGORIES, MATERIAL_TYPES } from '../data/coursesData';
import {
  subscribeMaterialsFromFirestore,
  uploadMaterialToFirestore,
  deleteMaterialFromFirestore,
} from '../lib/firestoreService';

// 업로드 용량 상한 (Storage 규칙과 동일하게 100MB로 맞춰둠 - 채점프로그램 설치파일 등을 고려)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

export const MaterialsAdminPanel: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseCategory, setCourseCategory] = useState(MATERIAL_COURSE_CATEGORIES[0]);
  const [materialType, setMaterialType] = useState<MaterialItem['materialType']>('서식');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeMaterialsFromFirestore((data) => {
      setMaterials(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setStatusMessage({ type: 'error', text: `파일 용량은 최대 ${formatFileSize(MAX_FILE_SIZE)}까지 업로드할 수 있습니다.` });
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // 확장자를 뺀 파일명을 제목 기본값으로 채워줍니다.
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    setStatusMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage({ type: 'error', text: '업로드할 파일을 선택해 주세요.' });
      return;
    }
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: '자료 제목을 입력해 주세요.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage(null);

    try {
      await uploadMaterialToFirestore(
        selectedFile,
        { title, description, courseCategory, materialType },
        (percent) => setUploadProgress(percent)
      );
      setStatusMessage({ type: 'success', text: `'${title}' 자료가 업로드되었습니다.` });
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      const fileInput = document.getElementById('material-file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('자료 업로드 실패:', err);
      setStatusMessage({ type: 'error', text: '업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (item: MaterialItem) => {
    setDeletingId(item.id);
    try {
      await deleteMaterialFromFirestore(item.id, item.storagePath);
    } catch (err) {
      console.error('자료 삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-5">
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          새 자료 업로드
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">과정 분류</label>
            <select
              value={courseCategory}
              onChange={(e) => setCourseCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
            >
              {MATERIAL_COURSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">자료 유형</label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as MaterialItem['materialType'])}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white"
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">자료 제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 컴활 1급 실기 예제 파일 (2026)"
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">설명 (선택)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="예: 실기 시험 대비 연습용 예제 파일입니다."
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">파일 선택 *</label>
          <input
            id="material-file-input"
            type="file"
            onChange={handleFileSelect}
            className="w-full text-xs sm:text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold file:cursor-pointer cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            최대 {formatFileSize(MAX_FILE_SIZE)}까지 업로드 가능합니다. 채점프로그램(.exe) 등 실행 파일은
            브라우저 보안 경고를 피하기 위해 .zip으로 압축해서 올리는 것을 권장합니다.
          </p>
          {selectedFile && (
            <p className="text-xs text-slate-600 mt-1.5 font-semibold">
              선택됨: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        {isUploading && (
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 font-bold">업로드 중... {uploadProgress}%</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-sm rounded-2xl shadow-md shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>업로드 중...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>자료 업로드</span>
            </>
          )}
        </button>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm">등록된 자료 ({materials.length}건)</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">등록된 자료가 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {materials.map((item) => {
              const Icon = getFileIcon(item.fileName);
              return (
                <div key={item.id} className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.courseCategory} · {item.materialType} · {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                  <a
                    href={item.fileURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                    title="다운로드"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        {deletingId === item.id ? '삭제 중...' : '삭제 확인'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

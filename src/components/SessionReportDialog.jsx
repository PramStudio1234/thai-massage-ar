import { useRef, useState } from 'react';
import { Download, X, FileText } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import SessionReport from './SessionReport';
import LoadingIndicator from './LoadingIndicator';
import { exportReportPdf } from '../utils/exportReportPdf';

export default function SessionReportDialog({ session, studentName, onClose }) {
  const { currentUser } = usePlatform();
  const paper = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const canExport = ['admin', 'super_admin', 'super'].includes(currentUser?.role);
  const download = async () => {
    if (!canExport || exporting) return;
    setExporting(true);
    setError('');
    try { await exportReportPdf(paper.current, session.id); }
    catch { setError('บันทึก PDF ไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setExporting(false); }
  };
  return (
    <div 
      className="report-dialog-backdrop animate-fade-in" 
      role="dialog" 
      aria-modal="true" 
      aria-label="สรุปผลการฝึก"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="report-dialog">
        <div className="report-toolbar">
          <div className="flex items-center gap-1.5 text-xs text-white/90 mr-auto font-medium">
            <FileText size={15} className="text-amber-300" />
            <span>กระดาษสรุปผลการฝึก</span>
          </div>
          {canExport && (
            <button type="button" className="jelly-button" onClick={download} disabled={exporting}>
              {exporting ? <LoadingIndicator tone="white" label="กำลังสร้าง PDF" /> : <Download size={14} />}
              <span>{exporting ? 'กำลังสร้าง PDF...' : 'บันทึกเป็น PDF'}</span>
            </button>
          )}
          <button type="button" className="jelly-button jelly-button-secondary" onClick={onClose}>
            <X size={14} />
            <span>ปิด</span>
          </button>
        </div>
        {error && <p className="report-error" role="alert">{error}</p>}
        <SessionReport ref={paper} session={session} studentName={studentName} />
      </div>
    </div>
  );
}

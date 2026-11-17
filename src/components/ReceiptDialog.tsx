import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { renderReceipt, type ReceiptSnapshot } from '../export/receipt.ts';

type ReceiptDialogProps = { snapshot: ReceiptSnapshot | null; onClose: () => void };
type Preview = { source: ReceiptSnapshot; frozen: ReceiptSnapshot; url: string };
type Failure = { source: ReceiptSnapshot; message: string };

const buttonStyle = { minHeight: 44, padding: '10px 18px', border: '1px solid currentColor', borderRadius: 6, fontWeight: 600 } as const;

function OpenReceipt({ snapshot, onClose }: { snapshot: ReceiptSnapshot; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setPreview(null);
    setFailure(null);
    async function generate() {
      try {
        const frozen: ReceiptSnapshot = structuredClone(snapshot);
        const blob = await renderReceipt(frozen);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreview({ source: snapshot, frozen, url });
      } catch (error) {
        if (cancelled) return;
        const detail = error instanceof Error ? error.message : '浏览器无法生成 PNG';
        const message = `小票生成失败：${detail}。请重试，或关闭后重新生成。`;
        setFailure({ source: snapshot, message });
        toast.error(message, { id: 'receipt-export-error' });
      }
    }
    void generate();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshot, attempt]);

  const currentPreview = preview?.source === snapshot ? preview : null;
  const error = failure?.source === snapshot ? failure.message : null;
  const ready = currentPreview !== null && error === null;
  const filename = currentPreview
    ? `地球小票-${currentPreview.frozen.comparison.current.specimen.id}-${currentPreview.frozen.createdAt.replace(/[^0-9A-Za-z]/g, '-')}.png`
    : '地球小票.png';

  function retry() {
    setPreview(null);
    setFailure(null);
    setAttempt(value => value + 1);
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="receipt-dialog"
        showCloseButton={false}
        onOpenAutoFocus={() => {
          if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[role="dialog"]')) opener.current = document.activeElement;
        }}
        onCloseAutoFocus={event => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
        style={{ width: 'calc(100vw - 24px)', maxWidth: 760, maxHeight: 'calc(100dvh - 24px)', display: 'flex', flexDirection: 'column', gap: 16, padding: 20, overflow: 'hidden', background: '#f6f3e9', color: '#20231f' }}
        data-receipt-carbon={currentPreview?.frozen.comparison.current.totals.carbon}
        data-receipt-created-at={currentPreview?.frozen.createdAt}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div>
            <DialogTitle style={{ fontSize: 24, lineHeight: 1.3 }}>地球小票</DialogTitle>
            <DialogDescription style={{ marginTop: 8, color: '#62665e', fontSize: 14, lineHeight: 1.6 }}>
              生成时的选择已定格。预览与下载使用同一张 1200 × 1600 PNG，全程本地生成。
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button type="button" aria-label="关闭地球小票" style={{ ...buttonStyle, flexShrink: 0 }}>关闭</button>
          </DialogClose>
        </header>

        <div style={{ overflowY: 'auto', minHeight: 0, flex: '1 1 auto', overscrollBehavior: 'contain', background: '#e5e5dc', border: '1px solid #c9cbbf', borderRadius: 4 }} aria-busy={!currentPreview && !error}>
          {error ? (
            <div role="alert" style={{ padding: 24, lineHeight: 1.7 }}>
              <p>{error}</p>
              <button type="button" onClick={retry} style={{ ...buttonStyle, marginTop: 16 }}>重新生成小票</button>
            </div>
          ) : currentPreview ? (
            <img
              src={currentPreview.url}
              width={1200}
              height={1600}
              alt={`${currentPreview.frozen.comparison.current.specimen.name}的地球小票：六层构成、基线与当前排放、年度和四年同等服务对比，以及科学边界。`}
              style={{ display: 'block', width: '100%', height: 'auto' }}
              onError={() => {
                const message = 'PNG 预览加载失败，尚未下载。请重新生成小票。';
                setFailure({ source: snapshot, message });
                toast.error(message, { id: 'receipt-export-error' });
              }}
            />
          ) : (
            <p role="status" style={{ padding: '48px 24px', textAlign: 'center' }}>正在本地绘制六层小票…</p>
          )}
        </div>

        <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: '#62665e' }}>教学情景，非认证碳标签。下载由浏览器保存。</p>
          {ready ? (
            <a
              href={currentPreview.url}
              download={filename}
              aria-label="下载地球小票 PNG"
              style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#176344', color: '#f6f3e9', textDecoration: 'none' }}
            >
              下载地球小票 PNG
            </a>
          ) : (
            <button type="button" disabled aria-label="下载地球小票 PNG" style={{ ...buttonStyle, opacity: 0.5 }}>下载地球小票 PNG</button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export function ReceiptDialog({ snapshot, onClose }: ReceiptDialogProps) {
  return snapshot ? <OpenReceipt snapshot={snapshot} onClose={onClose} /> : null;
}

export default ReceiptDialog;

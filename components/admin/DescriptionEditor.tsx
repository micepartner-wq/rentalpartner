import { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Image as ImageIcon, Italic, Loader2, Underline } from 'lucide-react';
import { uploadImage } from '../../src/api/storageApi';
import { applyImageAlignment, applyImageSize, normalizeDescriptionImageAlignment, type ImageAlign } from '../../src/utils/descriptionHtml';

// 상품 상세 화면(ProductDetail)과 같은 글꼴·이미지 규칙을 써서, 편집기에서 보이는 모양이 그대로 사이트에 나오게 한다.
const CONTENT_CLASS = 'prose prose-slate max-w-none w-full leading-relaxed [&>p]:m-0 [&>img]:m-0 [&>img]:w-full [&>img]:rounded-xl';
const SELECTED_ATTR = 'data-selected';
const SIZE_OPTIONS = [25, 50, 75, 100];
// 선택 표시는 편집할 때만 쓰는 표시라 저장하는 내용에서는 뺀다.
const stripEditingMarks = (html: string) => html.replace(/\sdata-selected="true"/g, '');

export const DescriptionEditor = ({ initialValue, onChange }: { initialValue: string, onChange: (val: string) => void }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [fillsWidth, setFillsWidth] = useState(false);

    useEffect(() => {
        const element = contentRef.current;
        if (!element || !initialValue) return;
        // 저장된 내용도 사이트와 같은 보정(이미지 정렬)을 거쳐 보여 준다.
        const wanted = normalizeDescriptionImageAlignment(initialValue);
        if (stripEditingMarks(element.innerHTML) !== wanted) {
            element.innerHTML = wanted;
            setSelectedImage(null);
            setFillsWidth(false);
        }
    }, [initialValue]);

    const handleInput = () => {
        if (contentRef.current) onChange(stripEditingMarks(contentRef.current.innerHTML));
    };

    // 이미지가 본문 폭을 꽉 채우면 좌·중·우 정렬을 해도 달라 보이지 않는다. 이를 알려 주기 위해 폭을 확인한다.
    const measureFill = (image: HTMLImageElement) => {
        const box = contentRef.current;
        if (box) setFillsWidth(image.getBoundingClientRect().width >= box.clientWidth - 36);
    };

    const selectImage = (image: HTMLImageElement | null) => {
        contentRef.current?.querySelectorAll(`img[${SELECTED_ATTR}]`).forEach((element) => element.removeAttribute(SELECTED_ATTR));
        if (!image) { setSelectedImage(null); setFillsWidth(false); return; }
        image.setAttribute(SELECTED_ATTR, 'true');
        setSelectedImage(image);
        measureFill(image);
    };

    // 글자 크기 선택 칸을 누르면 선택 영역이 풀릴 수 있어, 에디터 안 마지막 선택 영역을 기억해 둔다.
    const savedRange = useRef<Range | null>(null);
    const saveRange = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && contentRef.current?.contains(selection.anchorNode)) {
            savedRange.current = selection.getRangeAt(0).cloneRange();
        }
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        const selection = window.getSelection();
        if (savedRange.current && contentRef.current && !contentRef.current.contains(selection?.anchorNode ?? null)) {
            contentRef.current.focus();
            selection?.removeAllRanges();
            selection?.addRange(savedRange.current);
        }
        document.execCommand(command, false, value);
        handleInput();
        contentRef.current?.focus();
    };

    // 이미지를 누른 상태에서 정렬·크기 버튼을 누르면 글자가 아니라 그 이미지에 적용한다.
    // (브라우저 기본 정렬은 이미지에 text-align 만 남겨 실제로는 아무 효과가 없다.)
    const activeImage = () => (selectedImage && contentRef.current?.contains(selectedImage) ? selectedImage : null);
    const alignSelection = (align: ImageAlign) => {
        const image = activeImage();
        if (image) {
            applyImageAlignment(image, align);
            measureFill(image);
            handleInput();
            return;
        }
        execCmd(align === 'left' ? 'justifyLeft' : align === 'center' ? 'justifyCenter' : 'justifyRight');
    };
    const resizeSelection = (percent: number) => {
        const image = activeImage();
        if (!image) return;
        applyImageSize(image, percent);
        measureFill(image);
        handleInput();
    };

    const handleImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                setUploading(true);
                try {
                    const url = await uploadImage(file, 'description-images');
                    execCmd('insertImage', url);
                } catch (error) {
                    alert('이미지 업로드 실패');
                } finally {
                    setUploading(false);
                }
            }
        };
        input.click();
    };

    const imageSelected = Boolean(activeImage());

    return (
        <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col h-72">
            <style>{`.de-content img[${SELECTED_ATTR}="true"]{outline:3px solid #0ea5e9;outline-offset:-3px}`}</style>
            <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 items-center">
                <button type="button" onClick={() => execCmd('bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Bold size={18} /></button>
                <button type="button" onClick={() => execCmd('italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Italic size={18} /></button>
                <button type="button" onClick={() => execCmd('underline')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Underline size={18} /></button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button type="button" aria-label="왼쪽 정렬" onMouseDown={(e) => e.preventDefault()} onClick={() => alignSelection('left')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><AlignLeft size={18} /></button>
                <button type="button" aria-label="가운데 정렬" onMouseDown={(e) => e.preventDefault()} onClick={() => alignSelection('center')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><AlignCenter size={18} /></button>
                <button type="button" aria-label="오른쪽 정렬" onMouseDown={(e) => e.preventDefault()} onClick={() => alignSelection('right')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><AlignRight size={18} /></button>
                <select aria-label="글자 크기" value="" onChange={(e) => { if (e.target.value) execCmd('fontSize', e.target.value); }} className="ml-1 h-8 rounded border border-slate-300 bg-white px-1 text-xs text-slate-700">
                    <option value="">글자 크기</option>
                    <option value="2">작게</option>
                    <option value="3">보통</option>
                    <option value="4">조금 크게</option>
                    <option value="5">크게</option>
                    <option value="6">아주 크게</option>
                </select>
                <select aria-label="이미지 크기" value="" disabled={!imageSelected} onChange={(e) => { if (e.target.value) resizeSelection(Number(e.target.value)); }}
                    title={imageSelected ? '선택한 이미지의 가로 크기' : '이미지를 먼저 눌러 선택하세요'}
                    className="h-8 rounded border border-slate-300 bg-white px-1 text-xs text-slate-700 disabled:opacity-40">
                    <option value="">이미지 크기</option>
                    {SIZE_OPTIONS.map((percent) => <option key={percent} value={percent}>{percent === 100 ? '꽉 차게 100%' : `${percent}%`}</option>)}
                </select>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button type="button" onClick={handleImage} disabled={uploading} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                    <span className="text-xs font-medium">이미지</span>
                </button>
            </div>
            {imageSelected && fillsWidth && (
                <p role="status" className="bg-sky-50 px-3 py-1.5 text-xs text-sky-800">
                    이미지가 가로 폭을 꽉 채우고 있어 정렬해도 달라 보이지 않아요. 위의 &quot;이미지 크기&quot;를 줄이면 왼쪽·가운데·오른쪽 정렬이 보입니다.
                </p>
            )}
            <div ref={contentRef} className={`de-content flex-1 p-4 overflow-y-auto outline-none bg-white ${CONTENT_CLASS}`} contentEditable onInput={handleInput}
                onClick={(e) => selectImage(e.target instanceof HTMLImageElement ? e.target : null)} onKeyUp={saveRange} onMouseUp={saveRange} onBlur={saveRange} />
        </div>
    );
};

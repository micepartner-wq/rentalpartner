import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { addBoardPost, getBoardPostById, getBoardPosts, updateBoardPost } from '../src/api/cmsApi';
import { getBoardCategories } from '../src/api/siteSettingsApi';
import { uploadImage } from '../src/api/storageApi';
import { buildGnbContentImageToken } from '../src/utils/gnbContent';
import { useAuth } from '../src/context/AuthContext';

const IMAGE_TOKEN_PATTERN = /^\[\[image:(https?:\/\/[^\]\s]+)\]\]$/i;
const IMAGE_URL_PATTERN = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i;

const toTokenContent = (editor: HTMLDivElement | null): string => {
  if (!editor) return '';

  const clone = editor.cloneNode(true) as HTMLDivElement;

  // 대표이미지 선택용 UI 텍스트가 본문으로 저장되지 않도록 제거한다.
  clone.querySelectorAll('[data-role="representative-button"], [data-role="representative-badge"]').forEach((node) => {
    node.remove();
  });

  clone.querySelectorAll<HTMLElement>('[data-editor-image="true"]').forEach((wrapper) => {
    const src = wrapper.querySelector('img')?.getAttribute('src')?.trim();
    const tokenBlock = document.createElement('div');
    tokenBlock.textContent = src ? buildGnbContentImageToken(src) : '';
    wrapper.replaceWith(tokenBlock);
  });

  return (clone.innerText || '')
    .replace(/\u00A0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n')
    .trim();
};

const getEditorIsEmpty = (editor: HTMLDivElement | null): boolean => {
  if (!editor) return true;

  const text = (editor.innerText || '').replace(/\u00A0/g, ' ').trim();
  const imageCount = editor.querySelectorAll('[data-editor-image="true"] img').length;
  return text.length === 0 && imageCount === 0;
};

export interface ReviewCreatePageProps {
  editPostId?: string;
}

export const ReviewCreatePage: React.FC<ReviewCreatePageProps> = ({ editPostId }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEditMode = Boolean(editPostId);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [bodyDragActive, setBodyDragActive] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editorEmpty, setEditorEmpty] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const refreshEditorState = () => {
    setEditorEmpty(getEditorIsEmpty(editorRef.current));
  };

  const selectRepresentativeImage = (nextImageUrl: string) => {
    setImageUrl(nextImageUrl);
    setError((prev) => (prev === '대표 이미지를 업로드해주세요.' ? '' : prev));
  };

  const saveSelectionRange = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return;

    savedRangeRef.current = range.cloneRange();
  };

  const createEditorImageWrapper = (editorImageUrl: string) => {
    const wrapper = document.createElement('div');
    wrapper.dataset.editorImage = 'true';
    wrapper.dataset.imageUrl = editorImageUrl;
    wrapper.contentEditable = 'false';
    wrapper.className = 'group relative my-3 overflow-hidden rounded-lg border border-slate-200 bg-white transition';

    const image = document.createElement('img');
    image.src = editorImageUrl;
    image.alt = '본문 이미지';
    image.className = 'block h-auto w-full object-contain';
    wrapper.appendChild(image);

    const badge = document.createElement('div');
    badge.dataset.role = 'representative-badge';
    badge.className = 'pointer-events-none absolute left-2 top-2 hidden rounded bg-[#001E45] px-2 py-1 text-[11px] font-semibold text-white';
    badge.textContent = '대표이미지';
    wrapper.appendChild(badge);

    const chooseButton = document.createElement('button');
    chooseButton.type = 'button';
    chooseButton.dataset.role = 'representative-button';
    chooseButton.contentEditable = 'false';
    chooseButton.className = 'absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100';
    chooseButton.textContent = '대표이미지 선택';
    chooseButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectRepresentativeImage(editorImageUrl);
    });
    wrapper.appendChild(chooseButton);

    return wrapper;
  };

  const setEditorContentFromToken = (content: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.innerHTML = '';
    const normalizedContent = (content || '').replace(/\r\n/g, '\n').trim();
    if (!normalizedContent) {
      refreshEditorState();
      return;
    }

    const blocks = normalizedContent
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter((block) => block.length > 0);

    blocks.forEach((block) => {
      const imageMatch = block.match(IMAGE_TOKEN_PATTERN);
      if (imageMatch?.[1]) {
        editor.appendChild(createEditorImageWrapper(imageMatch[1]));
      } else {
        const textBlock = document.createElement('div');
        textBlock.textContent = block;
        editor.appendChild(textBlock);
      }

      const spacer = document.createElement('div');
      spacer.appendChild(document.createElement('br'));
      editor.appendChild(spacer);
    });

    refreshEditorState();
  };

  const parseDroppedImageUrls = (data: DataTransfer): string[] => {
    const plain = data.getData('text/plain')?.trim() || '';
    const uri = data.getData('text/uri-list')?.trim() || '';
    const candidate = plain || uri;
    if (!candidate) return [];

    const lines = candidate
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const urls: string[] = [];
    lines.forEach((line) => {
      const tokenMatch = line.match(IMAGE_TOKEN_PATTERN);
      if (tokenMatch?.[1]) {
        urls.push(tokenMatch[1]);
        return;
      }

      if (IMAGE_URL_PATTERN.test(line)) {
        urls.push(line);
      }
    });

    return urls;
  };

  const insertImageIntoEditor = (uploadedUrl: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    let range: Range;

    if (savedRangeRef.current) {
      range = savedRangeRef.current.cloneRange();
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    const wrapper = createEditorImageWrapper(uploadedUrl);

    const spacer = document.createElement('div');
    spacer.appendChild(document.createElement('br'));

    const fragment = document.createDocumentFragment();
    fragment.appendChild(wrapper);
    fragment.appendChild(spacer);

    range.deleteContents();
    range.insertNode(fragment);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(spacer);
    nextRange.collapse(false);

    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();

    refreshEditorState();
  };

  const normalizeEditorTokens = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }

    textNodes.forEach((node) => {
      const raw = node.textContent || '';
      const normalized = raw.replace(/\u00A0/g, ' ').trim();
      const match = normalized.match(IMAGE_TOKEN_PATTERN);
      if (!match?.[1] || !node.parentNode) return;

      const imageWrapper = createEditorImageWrapper(match[1]);
      const spacer = document.createElement('div');
      spacer.appendChild(document.createElement('br'));

      const fragment = document.createDocumentFragment();
      fragment.appendChild(imageWrapper);
      fragment.appendChild(spacer);
      node.parentNode.replaceChild(fragment, node);
    });
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const reviewCategories = await getBoardCategories('review');
        const normalized = reviewCategories.filter((item) => item.trim().length > 0);
        setCategories(normalized);
        setCategory((prev) => prev || normalized[0] || '일반');
      } catch (e) {
        console.error('Failed to load review categories', e);
        setCategories(['일반']);
        setCategory((prev) => prev || '일반');
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadPostForEdit = async () => {
      if (!isEditMode || !editPostId) return;

      setLoadingPost(true);
      try {
        const post = await getBoardPostById(editPostId);
        if (!post || post.board_type !== 'review') {
          setError('수정할 게시글을 찾을 수 없습니다.');
          return;
        }

        setTitle(post.title || '');
        setCategory(post.category || '');
        setImageUrl(post.image_url || post.mobile_image_url || '');
        setInitialContent(post.content || '');
        setDisplayOrder(Number(post.display_order || 1));
      } catch (e) {
        console.error('Failed to load review post for edit', e);
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        setLoadingPost(false);
      }
    };

    loadPostForEdit();
  }, [editPostId, isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    setEditorContentFromToken(initialContent);
  }, [initialContent, isEditMode]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const wrappers = editor.querySelectorAll<HTMLElement>('[data-editor-image="true"]');
    wrappers.forEach((wrapper) => {
      const currentImageUrl = wrapper.dataset.imageUrl || '';
      const chooseBtn = wrapper.querySelector<HTMLButtonElement>('[data-role="representative-button"]');
      const badge = wrapper.querySelector<HTMLElement>('[data-role="representative-badge"]');
      const image = wrapper.querySelector<HTMLImageElement>('img');
      const isSelected = imageUrl.length > 0 && imageUrl === currentImageUrl;

      wrapper.classList.toggle('border-[#001E45]', isSelected);
      wrapper.classList.toggle('ring-2', isSelected);
      wrapper.classList.toggle('ring-[#001E45]', isSelected);
      wrapper.classList.toggle('bg-[#edf4ff]', isSelected);
      wrapper.classList.toggle('shadow-[0_0_0_1px_rgba(0,30,69,0.08)]', isSelected);
      if (chooseBtn) {
        chooseBtn.textContent = isSelected ? '대표이미지 선택됨' : '대표이미지 선택';
        chooseBtn.classList.toggle('bg-[#001E45]', isSelected);
        chooseBtn.classList.toggle('bg-black/70', !isSelected);
      }
      if (badge) {
        badge.classList.toggle('hidden', !isSelected);
      }
      if (image) {
        image.classList.toggle('opacity-95', isSelected);
      }
    });
  }, [imageUrl]);

  if (!isAdmin) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: { pathname: isEditMode && editPostId ? `/review/${editPostId}/edit` : '/review/new' } }}
      />
    );
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setError('');
    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadImage(file, 'gnb-posts/review');
      setImageUrl(uploadedUrl);
    } catch (e) {
      console.error('Failed to upload review image', e);
      setError('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const uploadBodyImages = async (files: File[]) => {
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setError('');
    setUploadingBodyImage(true);
    try {
      for (const file of imageFiles) {
        const uploadedUrl = await uploadImage(file, 'gnb-posts/review/content');
        insertImageIntoEditor(uploadedUrl);
      }
    } catch (e) {
      console.error('Failed to upload body image', e);
      setError('본문 이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploadingBodyImage(false);
    }
  };

  const handleBodyInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadBodyImages(files);
    if (bodyImageInputRef.current) {
      bodyImageInputRef.current.value = '';
    }
  };

  const handleBodyDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setBodyDragActive(false);

    const droppedImageUrls = parseDroppedImageUrls(e.dataTransfer);
    if (droppedImageUrls.length > 0) {
      droppedImageUrls.forEach((url) => insertImageIntoEditor(url));
      return;
    }

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await uploadBodyImages(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedTitle = title.trim();
    const normalizedCategory = category.trim();
    const serializedContent = toTokenContent(editorRef.current);

    if (!normalizedTitle) {
      setError('제목을 입력해주세요.');
      return;
    }

    if (!normalizedCategory) {
      setError('카테고리를 선택해주세요.');
      return;
    }

    if (!imageUrl) {
      setError('대표 이미지를 업로드해주세요.');
      return;
    }

    if (!serializedContent) {
      setError('본문을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && editPostId) {
        const updated = await updateBoardPost(editPostId, {
          category: normalizedCategory,
          title: normalizedTitle,
          content: serializedContent,
          image_url: imageUrl,
          mobile_image_url: imageUrl,
          display_order: displayOrder,
          is_active: true,
        });

        navigate(updated.id ? `/review/${updated.id}` : '/review', { replace: true });
      } else {
        const existing = await getBoardPosts('review');
        const nextDisplayOrder = existing.length > 0
          ? Math.max(...existing.map((post) => Number(post.display_order || 0))) + 1
          : 1;

        const created = await addBoardPost({
          board_type: 'review',
          category: normalizedCategory,
          title: normalizedTitle,
          content: serializedContent,
          image_url: imageUrl,
          mobile_image_url: imageUrl,
          display_order: nextDisplayOrder,
          is_active: true,
        });

        navigate(created.id ? `/review/${created.id}` : '/review', { replace: true });
      }
    } catch (e) {
      console.error('Failed to submit review post', e);
      setError(isEditMode ? '사례 수정에 실패했습니다. 잠시 후 다시 시도해주세요.' : '사례 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f6f7f9] min-h-screen py-8 md:py-10">
      <Container>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[32px] leading-tight font-bold text-[#101828]">{isEditMode ? '설치사례 수정' : '설치사례 등록'}</h1>
          <Link
            to={isEditMode && editPostId ? `/review/${editPostId}` : '/review'}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> 목록으로
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          {loadingPost && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              게시글을 불러오는 중입니다...
            </div>
          )}
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="설치사례 제목"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#001E45]"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#001E45]"
                required
              >
                {categories.length === 0 && <option value="일반">일반</option>}
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">대표 이미지</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputFileChange}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-[140px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-center ${
                dragActive ? 'border-[#001E45] bg-[#edf3fc]' : 'border-slate-300 bg-slate-50'
              }`}
            >
              {uploadingImage ? (
                <p className="text-sm text-slate-600">이미지 업로드 중...</p>
              ) : (
                <div className="text-sm text-slate-500">
                  <p>이미지 업로드</p>
                  <p className="mt-1 text-xs">드래그하거나 클릭해서 파일을 선택하세요.</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">본문 이미지에 마우스를 올리면 대표이미지 선택 버튼이 표시됩니다.</p>

            {imageUrl && (
              <div className="mt-3 w-full max-w-[320px] overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img src={imageUrl} alt="대표 이미지 미리보기" className="h-auto w-full object-cover" />
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-semibold text-slate-700">본문</label>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => bodyImageInputRef.current?.click()}
                disabled={uploadingBodyImage}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {uploadingBodyImage ? '본문 이미지 업로드 중...' : '본문 이미지 추가'}
              </button>
            </div>
            <input
              ref={bodyImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleBodyInputFileChange}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setBodyDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setBodyDragActive(false);
              }}
              onDrop={handleBodyDrop}
              className={`relative min-h-[300px] rounded-lg border transition-colors ${
                bodyDragActive ? 'border-[#001E45] bg-[#edf3fc]' : 'border-slate-300 bg-white'
              }`}
            >
              {editorEmpty && (
                <p className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">
                  본문을 작성하고 이미지를 드래그해서 업로드하세요.
                </p>
              )}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  normalizeEditorTokens();
                  refreshEditorState();
                }}
                onKeyUp={saveSelectionRange}
                onMouseUp={saveSelectionRange}
                onBlur={saveSelectionRange}
                onDrop={handleBodyDrop}
                className="min-h-[300px] px-4 py-3 text-sm leading-7 text-slate-800 outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">본문 에디터 안으로 이미지를 드래그하면 해당 위치에 바로 표시됩니다.</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate(isEditMode && editPostId ? `/review/${editPostId}` : '/review')}
              className="rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loadingPost || submitting || uploadingImage || uploadingBodyImage}
              className="rounded-lg bg-[#3cb44b] py-3 text-sm font-semibold text-white hover:bg-[#35a142] disabled:opacity-60"
            >
              {submitting ? (isEditMode ? '수정 중...' : '등록 중...') : (isEditMode ? '사례수정' : '사례등록')}
            </button>
          </div>
        </form>
      </Container>
    </div>
  );
};

export default ReviewCreatePage;

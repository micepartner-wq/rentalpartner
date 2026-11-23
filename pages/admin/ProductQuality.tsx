import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Pencil, RefreshCw, Search } from 'lucide-react';
import { getProducts, isBasicProduct } from '../../src/api/productApi';
import { evaluateProductQuality, summarizeQuality, type ProductQuality as ProductQualityResult } from '../../src/utils/productQuality';

const PAGE_SIZE = 30;

type StatusFilter = 'all' | 'required' | 'complete';
type KindFilter = 'all' | 'general' | 'package';

const scoreTone = (score: number) =>
  score >= 90 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500';

export const ProductQuality = () => {
  const [items, setItems] = useState<ProductQualityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const products = await getProducts({ catalogType: 'all' });
      // 고객에게 보이는 일반 상품과 패키지만 점검한다(추가 구성·부가서비스 등은 제외).
      setItems(products.filter(isBasicProduct).map(evaluateProductQuality));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '상품을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setVisible(PAGE_SIZE); }, [status, kind, issueKey, query]);

  const summary = useMemo(() => summarizeQuality(items), [items]);
  const issueChips = useMemo(
    () => Object.entries(summary.issueCounts).sort((a, b) => b[1].count - a[1].count),
    [summary],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items
      .filter((item) => kind === 'all' || item.kind === kind)
      .filter((item) => status === 'all' || (status === 'required' ? item.hasRequiredIssue : item.issues.length === 0))
      .filter((item) => !issueKey || item.issues.some((issue) => issue.key === issueKey))
      .filter((item) => !keyword || [item.product.name, item.product.category].some((text) => text?.toLowerCase().includes(keyword)))
      // 가장 급한(점수가 낮은) 상품이 위로 오게 한다.
      .sort((a, b) => a.score - b.score || a.product.name.localeCompare(b.product.name, 'ko-KR'));
  }, [items, kind, status, issueKey, query]);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'border-[#001E45] bg-[#001E45] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">상품 품질 점검</h2>
          <p className="mt-1 text-sm text-slate-500">고객에게 보이는 정보가 비어 있는 상품을 모아 보여줍니다. 점수가 낮은 상품부터 채워 주세요.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> 새로고침
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: '점검 대상 상품', value: `${summary.total}개`, tone: 'text-slate-900' },
          { label: '필수 항목 부족', value: `${summary.needsRequired}개`, tone: summary.needsRequired ? 'text-red-600' : 'text-emerald-600' },
          { label: '모두 채워진 상품', value: `${summary.complete}개`, tone: 'text-emerald-600' },
          { label: '평균 점수', value: `${summary.averageScore}점`, tone: 'text-slate-900' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.tone}`}>{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-xs font-bold text-slate-500">상태</span>
          <button type="button" className={chip(status === 'all')} onClick={() => setStatus('all')}>전체</button>
          <button type="button" className={chip(status === 'required')} onClick={() => setStatus('required')}>필수 항목 부족 ({summary.needsRequired})</button>
          <button type="button" className={chip(status === 'complete')} onClick={() => setStatus('complete')}>모두 채워짐 ({summary.complete})</button>
          <span className="ml-3 w-14 text-xs font-bold text-slate-500">유형</span>
          <button type="button" className={chip(kind === 'all')} onClick={() => setKind('all')}>전체</button>
          <button type="button" className={chip(kind === 'general')} onClick={() => setKind('general')}>일반 상품</button>
          <button type="button" className={chip(kind === 'package')} onClick={() => setKind('package')}>패키지</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-xs font-bold text-slate-500">빈 항목</span>
          <button type="button" className={chip(issueKey === null)} onClick={() => setIssueKey(null)}>전체</button>
          {issueChips.map(([key, info]) => (
            <button key={key} type="button" className={chip(issueKey === key)} onClick={() => setIssueKey(issueKey === key ? null : key)}>
              {info.label} ({info.count})
            </button>
          ))}
        </div>
        <label className="relative block max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명·카테고리 검색"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#001E45]" />
        </label>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-[#001E45]" size={32} /></div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">조건에 맞는 상품이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.slice(0, visible).map((item) => (
            <li key={item.product.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {item.product.image_url
                  ? <img src={item.product.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 object-cover" loading="lazy" />
                  : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] text-slate-400">이미지 없음</span>}
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{item.product.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.kind === 'package' ? '패키지' : '일반 상품'}{item.product.category ? ` · ${item.product.category}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.issues.length === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} aria-hidden="true" />모두 채워짐</span>
                    ) : item.issues.map((issue) => (
                      <span key={issue.key} title={issue.hint}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${issue.severity === 'required' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                        {issue.severity === 'required' && <AlertTriangle size={12} aria-hidden="true" />}{issue.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:w-72 md:justify-end">
                <div className="w-24 shrink-0" aria-label={`점수 ${item.score}점`}>
                  <p className="text-right text-sm font-bold text-slate-800">{item.score}점</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${scoreTone(item.score)}`} style={{ width: `${item.score}%` }} /></div>
                </div>
                <Link to={`/admin/products?edit=${encodeURIComponent(item.product.id || '')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#001E45] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#002b63]">
                  <Pencil size={14} aria-hidden="true" /> 채우러 가기
                </Link>
                <a href={`/products/${encodeURIComponent(item.product.id || '')}`} target="_blank" rel="noopener noreferrer" aria-label={`${item.product.name} 사이트에서 보기`}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-slate-400"><ExternalLink size={16} aria-hidden="true" /></a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && filtered.length > visible && (
        <div className="text-center">
          <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-500">
            더 보기 ({filtered.length - visible}개 남음)
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductQuality;

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, type Product } from '../../src/api/productApi';
import { normalizeInstallationCases } from '../../src/utils/installationCases';
import { isSafeSceneImageUrl, normalizeInstallationScenes } from '../../src/utils/installationScenes';

/** 이 상품이 +태그로 연결된 패키지를 찾는다. 관리자가 따로 연결하지 않아도 패키지 쪽 태그에서 자동으로 이어진다. */
export const findPackagesContainingProduct = (packages: Product[], productId: string): Product[] =>
    packages.filter(pkg =>
        pkg.id && pkg.id !== productId && pkg.catalog_type === 'package' &&
        normalizeInstallationScenes(pkg.installation_scenes).some(scene =>
            scene.hotspots.some(hotspot => hotspot.product_id === productId)));

export function ProductInstallationCases({ productId, productName, cases }: { productId: string; productName?: string; cases: unknown }) {
    const photos = useMemo(() => normalizeInstallationCases(cases), [cases]);
    const [packages, setPackages] = useState<Product[]>([]);

    useEffect(() => {
        let cancelled = false;
        setPackages([]);
        // 패키지 조회가 실패해도 사진은 그대로 보여준다.
        getProducts({ catalogType: 'package' })
            .then(list => { if (!cancelled) setPackages(findPackagesContainingProduct(list, productId)); })
            .catch(() => { if (!cancelled) setPackages([]); });
        return () => { cancelled = true; };
    }, [productId]);

    if (photos.length === 0 && packages.length === 0) return null;

    return (
        <section className="mb-10 space-y-6">
            {photos.length > 0 && (
                <div>
                    <ul className="grid grid-cols-1 gap-3">
                        {photos.map((photo, index) => (
                            <li key={photo.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img src={photo.image_url} alt={productName ? `${productName} ${index + 1}` : ''} loading="lazy" draggable={false}
                                    className="aspect-[16/10] w-full object-cover" />
                            </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-400">
                        {packages.length > 0 ? '연출된 이미지입니다. 자세한 내용은 아래 패키지 상품에서 확인하실 수 있습니다.' : '연출된 이미지입니다.'}
                    </p>
                </div>
            )}
            {packages.length > 0 && (
                <div>
                    <h3 className="mb-3 text-base font-bold text-slate-900">이 상품이 포함된 패키지</h3>
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {packages.map(pkg => (
                            <li key={pkg.id}>
                                <Link to={`/products/${encodeURIComponent(pkg.id!)}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-[#001E45]">
                                    {pkg.image_url && isSafeSceneImageUrl(pkg.image_url)
                                        ? <img src={pkg.image_url} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                                        : <span className="h-16 w-16 shrink-0 rounded-lg bg-slate-100" aria-hidden="true" />}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-900">{pkg.name}</span>
                                        <span className="mt-0.5 block text-xs font-medium text-[#001E45]">패키지 보기 ↗</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

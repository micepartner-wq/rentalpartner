import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/productApi';
import { getProductsBySection } from '../api/sectionApi';
import { getCategories } from '../api/categoryApi';
import { getAllNavMenuItems } from '../api/cmsApi';

const fetchSectionProducts = async (sectionId: string) => {
  try {
    return await getProductsBySection(sectionId);
  } catch {
    return await getProducts();
  }
};

export const useProductsPageData = (sectionId: string | null = null) => {
  return useQuery({
    queryKey: ['productsPageData', sectionId],
    queryFn: async () => {
      const [productData, categoryData, menuData] = await Promise.all([
        sectionId ? fetchSectionProducts(sectionId) : getProducts(),
        getCategories().catch(() => []),
        getAllNavMenuItems().catch(() => []),
      ]);
      return { productData, categoryData, menuData };
    },
    staleTime: 5 * 60 * 1000,
  });
};

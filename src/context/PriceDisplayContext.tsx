import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
  getProductPriceDisplayMode,
  upsertProductPriceDisplayMode,
  type ProductPriceDisplayMode,
} from "../api/siteSettingsApi";
import { isInquiryPriceMode } from "../utils/priceDisplay";

interface PriceDisplayContextType {
  mode: ProductPriceDisplayMode;
  loading: boolean;
  isInquiryMode: boolean;
  updatePriceDisplayMode: (mode: ProductPriceDisplayMode) => Promise<void>;
  refreshPriceDisplayMode: () => Promise<void>;
}

const PriceDisplayContext = createContext<PriceDisplayContextType>({
  mode: DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
  loading: true,
  isInquiryMode: false,
  updatePriceDisplayMode: async () => {},
  refreshPriceDisplayMode: async () => {},
});

export const usePriceDisplay = () => useContext(PriceDisplayContext);

export const PriceDisplayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<ProductPriceDisplayMode>(
    DEFAULT_PRODUCT_PRICE_DISPLAY_MODE,
  );
  const [loading, setLoading] = useState(true);

  const refreshPriceDisplayMode = async () => {
    setLoading(true);
    try {
      const nextMode = await getProductPriceDisplayMode();
      setMode(nextMode);
    } catch (error) {
      console.error("Failed to load product price display mode:", error);
      setMode(DEFAULT_PRODUCT_PRICE_DISPLAY_MODE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshPriceDisplayMode();
  }, []);

  const updatePriceDisplayMode = async (nextMode: ProductPriceDisplayMode) => {
    const previousMode = mode;
    setMode(nextMode);

    try {
      await upsertProductPriceDisplayMode(nextMode);
    } catch (error) {
      setMode(previousMode);
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      mode,
      loading,
      isInquiryMode: !loading && isInquiryPriceMode(mode),
      updatePriceDisplayMode,
      refreshPriceDisplayMode,
    }),
    [loading, mode],
  );

  return (
    <PriceDisplayContext.Provider value={value}>
      {children}
    </PriceDisplayContext.Provider>
  );
};

export interface Product {
    id: string;
    name: string;
    category: string;
    catalogType?: 'general' | 'package';
    price: number;
    description: string;
    imageUrl: string;
    stock: number;
    discountRate?: number;
}

export interface Booking {
    id: string;
    productId: string;
    userId: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    status: 'pending' | 'quote_sent' | 'confirmed' | 'cancelled';
}

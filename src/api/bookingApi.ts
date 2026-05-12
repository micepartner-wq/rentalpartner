import { supabase } from '../lib/supabase';

export type BookingStatus =
    | 'pending'
    | 'quote_sent'
    | 'confirmed'
    | 'cancelled';

type LegacyBookingStatus = BookingStatus | 'negotiating' | 'completed';

export const BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
    { value: 'pending', label: '견적 요청' },
    { value: 'quote_sent', label: '견적 확인' },
    { value: 'confirmed', label: '계약 완료' },
    { value: 'cancelled', label: '요청 취소' },
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = BOOKING_STATUS_OPTIONS.reduce(
    (acc, option) => {
        acc[option.value] = option.label;
        return acc;
    },
    {} as Record<BookingStatus, string>,
);

const LEGACY_BOOKING_STATUS_MAP: Record<LegacyBookingStatus, BookingStatus> = {
    pending: 'pending',
    quote_sent: 'quote_sent',
    negotiating: 'quote_sent',
    confirmed: 'confirmed',
    completed: 'confirmed',
    cancelled: 'cancelled',
};

type RawBooking = Omit<Booking, 'status'> & {
    status: string;
};

export const normalizeBookingStatus = (status: string): BookingStatus => {
    if (status in LEGACY_BOOKING_STATUS_MAP) {
        return LEGACY_BOOKING_STATUS_MAP[status as LegacyBookingStatus];
    }

    return 'pending';
};

export const getBookingStatusLabel = (status: BookingStatus): string => BOOKING_STATUS_LABELS[status];

export const isBookingCancellable = (status: BookingStatus): boolean =>
    status === 'pending' || status === 'quote_sent';

export interface QuoteRequestItem {
    product_id: string;
    product_name: string;
    product_image_url?: string;
    product_quantity: number;
    unit_price: number;
    total_price: number;
    selected_options?: { name: string; quantity: number; price: number }[];
    basic_components?: { name: string; quantity: number; model_name?: string }[];
}

const normalizeBooking = (booking: RawBooking): Booking => ({
    ...booking,
    status: normalizeBookingStatus(booking.status),
    quote_items:
        Array.isArray(booking.quote_items) && booking.quote_items.length > 0
            ? booking.quote_items
            : [
                {
                    product_id: booking.product_id,
                    product_name: booking.products?.name || booking.product_id,
                    product_image_url: booking.products?.image_url,
                    product_quantity: 1,
                    unit_price: booking.total_price,
                    total_price: booking.total_price,
                    selected_options: booking.selected_options || [],
                    basic_components: booking.basic_components || [],
                },
            ],
});

export interface Booking {
    id?: string;
    product_id: string;
    user_id: string;
    user_email?: string;
    start_date: string;
    end_date: string;
    total_price: number;
    status: BookingStatus;
    created_at?: string;
    selected_options?: { name: string; quantity: number; price: number }[];
    basic_components?: { name: string; quantity: number; model_name?: string }[];
    quote_items?: QuoteRequestItem[];
    usage_period?: string;
    installation_place?: string;
    request_note?: string;
    // Joined data
    products?: {
        name: string;
        image_url: string;
    };
    user_profiles?: {
        name: string;
        company_name: string;
        phone: string;
        business_number?: string;
    };
}

// 모든 예약 조회 (Admin용) - 사용자 정보 포함
export const getBookings = async (): Promise<Booking[]> => {
    // First get bookings with products
    const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            *,
            products (
                name,
                image_url
            )
        `)
        .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;

    // Then fetch user profiles for each booking
    const bookings = bookingsData || [];
    const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];

    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('firebase_uid, name, company_name, phone, business_number')
            .in('firebase_uid', userIds);

        const profileMap = new Map(profiles?.map(p => [p.firebase_uid, p]) || []);

        return bookings.map((booking) => normalizeBooking({
            ...booking,
            user_profiles: profileMap.get(booking.user_id) || null,
        }));
    }

    return bookings.map((booking) => normalizeBooking(booking));
};

// 예약 삭제
export const deleteBooking = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// 사용자별 예약 조회
export const getUserBookings = async (userId: string): Promise<Booking[]> => {
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            products (
                name,
                image_url
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((booking) => normalizeBooking(booking));
};

// 예약 생성
export const createBooking = async (booking: Omit<Booking, 'id' | 'created_at' | 'products'>): Promise<Booking> => {
    const { data, error } = await supabase
        .from('bookings')
        .insert([booking])
        .select()
        .single();

    if (error) throw error;
    return normalizeBooking(data);
};

// 예약 상태 변경
export const updateBookingStatus = async (id: string, status: Booking['status']): Promise<Booking> => {
    const { data, error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return normalizeBooking(data);
};

// 특정 상품의 예약 가능 여부 확인 (날짜 중복 체크)
export const checkAvailability = async (
    productId: string,
    startDate: string,
    endDate: string
): Promise<boolean> => {
    const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('product_id', productId)
        .in('status', ['confirmed', 'completed'])
        .lte('start_date', endDate)
        .gte('end_date', startDate);

    if (error) throw error;
    return (data?.length || 0) === 0;
};

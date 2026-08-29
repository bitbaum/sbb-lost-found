export interface User {
  id: string;
  sbbUserId: string;
  email: string;
  phone?: string;
  preferredLanguage: 'de' | 'fr' | 'it' | 'en';
  hasMonthlyPass: boolean;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  vehicleId: string; // e.g., "BN N71", "B704"
  transportType: TransportType;
  capacity?: number;
  operator: string;
  createdAt: Date;
}

export interface Route {
  id: string;
  routeCode: string;
  originStation: string;
  destinationStation: string;
  description?: string;
  createdAt: Date;
}

export interface Trip {
  id: string;
  vehicleId: string;
  routeId: string;
  departureTime: Date;
  arrivalTime: Date;
  tripDate: Date;
  createdAt: Date;
}

export interface LostItem {
  id: string;
  reporterId: string;
  tripId?: string;
  category: ItemCategory;
  title: string;
  description: string;
  color?: string;
  brand?: string;
  size?: string;
  distinctiveFeatures?: string;
  approximateLossTime?: Date;
  lossLocation?: string;
  contactInfo?: Record<string, any>;
  rewardOffered: number;
  status: ItemStatus;
  aiEmbedding?: number[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FoundItem {
  id: string;
  finderId?: string;
  vehicleId?: string;
  tripId?: string;
  category: ItemCategory;
  title: string;
  description: string;
  color?: string;
  brand?: string;
  size?: string;
  distinctiveFeatures?: string;
  foundTime: Date;
  foundLocation?: string;
  currentLocation: string;
  handlerEmployeeId?: string;
  status: ItemStatus;
  aiEmbedding?: number[];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
  id: string;
  lostItemId: string;
  foundItemId: string;
  confidenceScore: number;
  aiReasoning?: string;
  status: MatchStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  matchedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: string[];
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface DriverNotification {
  id: string;
  vehicleId: string;
  lostItemId: string;
  message: string;
  priority: number;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
}

// Enums
export enum ItemCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  BAGS = 'bags',
  DOCUMENTS = 'documents',
  JEWELRY = 'jewelry',
  BOOKS = 'books',
  TOYS = 'toys',
  SPORTS_EQUIPMENT = 'sports_equipment',
  MEDICAL = 'medical',
  OTHER = 'other',
}

export enum ItemStatus {
  REPORTED_LOST = 'reported_lost',
  REPORTED_FOUND = 'reported_found',
  MATCHED = 'matched',
  RETURNED = 'returned',
  DISPOSED = 'disposed',
}

export enum TransportType {
  TRAIN = 'train',
  BUS = 'bus',
  TRAM = 'tram',
  FUNICULAR = 'funicular',
  CABLE_CAR = 'cable_car',
  BOAT = 'boat',
}

export enum MatchStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// API Request/Response types
export interface CreateLostItemRequest {
  tripId?: string;
  category: ItemCategory;
  title: string;
  description: string;
  color?: string;
  brand?: string;
  size?: string;
  distinctiveFeatures?: string;
  approximateLossTime?: string;
  lossLocation?: string;
  contactInfo?: Record<string, any>;
  rewardOffered?: number;
  images?: string[];
}

export interface CreateFoundItemRequest {
  vehicleId?: string;
  tripId?: string;
  category: ItemCategory;
  title: string;
  description: string;
  color?: string;
  brand?: string;
  size?: string;
  distinctiveFeatures?: string;
  foundTime?: string;
  foundLocation?: string;
  currentLocation: string;
  handlerEmployeeId?: string;
  images?: string[];
}

export interface SearchItemsQuery {
  query?: string;
  category?: ItemCategory;
  color?: string;
  brand?: string;
  dateFrom?: string;
  dateTo?: string;
  vehicleId?: string;
  routeId?: string;
  status?: ItemStatus;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// WebSocket Events
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface ItemMatchedEvent extends WebSocketEvent {
  type: 'item_matched';
  data: {
    matchId: string;
    lostItemId: string;
    foundItemId: string;
    confidenceScore: number;
  };
}

export interface DriverNotificationEvent extends WebSocketEvent {
  type: 'driver_notification';
  data: {
    vehicleId: string;
    message: string;
    priority: number;
  };
}

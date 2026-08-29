import { Pool } from 'pg';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface DriverNotification {
  id: string;
  lostItemId: string;
  vehicleId: string;
  driverId?: string;
  status: 'pending' | 'acknowledged' | 'found' | 'not_found';
  message: string;
  priority: 'normal' | 'urgent' | 'critical';
  location: string;
  category: string;
  createdAt: string;
  acknowledgedAt?: string;
  respondedAt?: string;
  response?: {
    notes?: string;
    foundItem?: boolean;
  };
  passengerInfo?: {
    tripRoute: string;
    tripTime: string;
    seatInfo?: string;
  };
}

export class DriverNotificationRepository {
  constructor(private db: Pool = pool) {}

  async create(data: {
    lostItemId: string;
    vehicleId: string;
    message: string;
    priority?: number;
    location?: string;
    category?: string;
    passengerInfo?: object;
  }): Promise<DriverNotification> {
    const query = `
      INSERT INTO driver_notifications (
        lost_item_id, vehicle_id, message, priority
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const priorityNum = data.priority || 1;
    const values = [data.lostItemId, data.vehicleId, data.message, priorityNum];

    try {
      const result = await this.db.query(query, values);
      logger.info('Driver notification created', {
        notificationId: result.rows[0].id,
        vehicleId: data.vehicleId,
      });
      return this.mapRowToNotification(result.rows[0], data);
    } catch (error) {
      logger.error('Failed to create driver notification', { error, data });
      throw error;
    }
  }

  async findByVehicle(
    vehicleId: string,
    filter?: 'all' | 'pending' | 'resolved',
    limit = 50,
  ): Promise<DriverNotification[]> {
    let query = `
      SELECT dn.*, li.category, li.loss_location, li.description,
             t.id as trip_id, r.origin_station, r.destination_station,
             t.departure_time
      FROM driver_notifications dn
      JOIN lost_items li ON dn.lost_item_id = li.id
      LEFT JOIN trips t ON li.trip_id = t.id
      LEFT JOIN routes r ON t.route_id = r.id
      WHERE dn.vehicle_id = $1
    `;

    const values: any[] = [vehicleId];

    if (filter === 'pending') {
      query += ` AND dn.acknowledged_at IS NULL`;
    } else if (filter === 'resolved') {
      query += ` AND dn.acknowledged_at IS NOT NULL`;
    }

    query += ` ORDER BY dn.created_at DESC LIMIT $2`;
    values.push(limit);

    try {
      const result = await this.db.query(query, values);
      return result.rows.map((row) => this.mapRowToNotification(row));
    } catch (error) {
      logger.error('Failed to find notifications by vehicle', { error, vehicleId });
      throw error;
    }
  }

  async findById(id: string): Promise<DriverNotification | null> {
    const query = `
      SELECT dn.*, li.category, li.loss_location, li.description,
             t.id as trip_id, r.origin_station, r.destination_station,
             t.departure_time
      FROM driver_notifications dn
      JOIN lost_items li ON dn.lost_item_id = li.id
      LEFT JOIN trips t ON li.trip_id = t.id
      LEFT JOIN routes r ON t.route_id = r.id
      WHERE dn.id = $1
    `;

    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToNotification(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find notification by ID', { error, id });
      throw error;
    }
  }

  async respond(
    id: string,
    status: 'found' | 'not_found',
    notes?: string,
    acknowledgedBy?: string,
  ): Promise<DriverNotification | null> {
    const query = `
      UPDATE driver_notifications
      SET acknowledged_at = NOW(), acknowledged_by = $2
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [id, acknowledgedBy || 'driver']);
      if (result.rows.length === 0) return null;

      // Also update the lost item status
      const lostItemStatus = status === 'found' ? 'found' : 'not_found';
      await this.db.query('UPDATE lost_items SET status = $1, updated_at = NOW() WHERE id = $2', [
        lostItemStatus,
        result.rows[0].lost_item_id,
      ]);

      logger.info('Driver notification responded', { notificationId: id, status });

      return this.mapRowToNotification(result.rows[0], {
        response: { notes, foundItem: status === 'found' },
      });
    } catch (error) {
      logger.error('Failed to respond to notification', { error, id });
      throw error;
    }
  }

  private mapRowToNotification(row: any, extra?: any): DriverNotification {
    const priority = row.priority <= 1 ? 'normal' : row.priority <= 3 ? 'urgent' : 'critical';
    const status = row.acknowledged_at
      ? extra?.response?.foundItem
        ? 'found'
        : 'not_found'
      : 'pending';

    return {
      id: row.id,
      lostItemId: row.lost_item_id,
      vehicleId: row.vehicle_id,
      driverId: row.acknowledged_by,
      status,
      message: row.message || row.description || 'Lost item reported',
      priority,
      location: row.loss_location || extra?.location || 'Unknown',
      category: row.category || extra?.category || 'other',
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      acknowledgedAt: row.acknowledged_at?.toISOString?.() || row.acknowledged_at,
      respondedAt: row.acknowledged_at?.toISOString?.() || row.acknowledged_at,
      response: extra?.response,
      passengerInfo: row.origin_station
        ? {
            tripRoute: `${row.origin_station} → ${row.destination_station}`,
            tripTime:
              row.departure_time?.toLocaleTimeString?.('de-CH', {
                hour: '2-digit',
                minute: '2-digit',
              }) || '',
            seatInfo: row.loss_location,
          }
        : extra?.passengerInfo,
    };
  }
}

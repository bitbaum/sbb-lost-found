import { Router, Request, Response } from 'express';
import { DriverNotificationRepository } from '../repositories/driverNotificationRepository';
import { rateLimit } from '../middleware/rateLimit';
import { logger } from '../utils/logger';
import { redisPublisher } from '../config/redis';

const router = Router();
const notificationRepo = new DriverNotificationRepository();

/**
 * @swagger
 * /api/driver-notifications:
 *   get:
 *     summary: Get driver notifications for a vehicle
 *     tags: [Driver Notifications]
 *     parameters:
 *       - in: query
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, pending, resolved]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of driver notifications
 */
router.get('/', rateLimit(60, 60), async (req: Request, res: Response) => {
  try {
    const vehicleId = req.query.vehicleId as string;
    const filter = req.query.filter as 'all' | 'pending' | 'resolved' | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_VEHICLE_ID', message: 'vehicleId is required' },
      });
    }

    const notifications = await notificationRepo.findByVehicle(vehicleId, filter, limit);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.error('Failed to get driver notifications', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve notifications' },
    });
  }
});

/**
 * @swagger
 * /api/driver-notifications/{id}:
 *   get:
 *     summary: Get a specific driver notification
 *     tags: [Driver Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Driver notification details
 *       404:
 *         description: Notification not found
 */
router.get('/:id', rateLimit(120, 60), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await notificationRepo.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.error('Failed to get driver notification', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve notification' },
    });
  }
});

/**
 * @swagger
 * /api/driver-notifications/{id}/respond:
 *   post:
 *     summary: Respond to a driver notification
 *     tags: [Driver Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [found, not_found]
 *               notes:
 *                 type: string
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Response recorded successfully
 *       404:
 *         description: Notification not found
 */
router.post('/:id/respond', rateLimit(30, 60), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !['found', 'not_found'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'status must be "found" or "not_found"' },
      });
    }

    const notification = await notificationRepo.respond(id, status, notes);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    // Publish event for real-time updates
    await redisPublisher.publish(
      'lost_item_status_updated',
      JSON.stringify({
        type: 'lost_item_status_updated',
        data: {
          notificationId: id,
          lostItemId: notification.lostItemId,
          status,
          notes,
        },
        timestamp: new Date().toISOString(),
      }),
    );

    res.json({
      success: true,
      data: notification,
    });

    logger.info('Driver responded to notification', { notificationId: id, status });
  } catch (error) {
    logger.error('Failed to respond to notification', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record response' },
    });
  }
});

/**
 * @swagger
 * /api/driver-notifications:
 *   post:
 *     summary: Create a new driver notification (internal use)
 *     tags: [Driver Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lostItemId:
 *                 type: string
 *                 format: uuid
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *               message:
 *                 type: string
 *               priority:
 *                 type: integer
 *             required:
 *               - lostItemId
 *               - vehicleId
 *               - message
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
router.post('/', rateLimit(30, 60), async (req: Request, res: Response) => {
  try {
    const { lostItemId, vehicleId, message, priority, location, category, passengerInfo } =
      req.body;

    if (!lostItemId || !vehicleId || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'lostItemId, vehicleId, and message are required',
        },
      });
    }

    const notification = await notificationRepo.create({
      lostItemId,
      vehicleId,
      message,
      priority,
      location,
      category,
      passengerInfo,
    });

    // Publish event for real-time notification to driver
    await redisPublisher.publish(
      'driver_notification',
      JSON.stringify({
        type: 'driver_notification',
        data: notification,
        timestamp: new Date().toISOString(),
      }),
    );

    res.status(201).json({
      success: true,
      data: notification,
    });

    logger.info('Driver notification created', { notificationId: notification.id, vehicleId });
  } catch (error) {
    logger.error('Failed to create driver notification', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create notification' },
    });
  }
});

export default router;

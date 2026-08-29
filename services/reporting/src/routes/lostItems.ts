import { Router } from 'express';
import { LostItemController } from '../controllers/lostItemController';
import { validateCreateLostItem, validateSearch } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const lostItemController = new LostItemController();

/**
 * @swagger
 * /api/lost-items:
 *   post:
 *     summary: Report a lost item
 *     tags: [Lost Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLostItemRequest'
 *     responses:
 *       201:
 *         description: Lost item reported successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LostItemResponse'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/',
  authenticate,
  rateLimit(10, 15 * 60), // 10 requests per 15 minutes
  validateCreateLostItem,
  lostItemController.createLostItem.bind(lostItemController),
);

/**
 * @swagger
 * /api/lost-items/search:
 *   get:
 *     summary: Search lost items
 *     tags: [Lost Items]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for title and description
 *       - in: query
 *         name: category
 *         schema:
 *           $ref: '#/components/schemas/ItemCategory'
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LostItemSearchResponse'
 */
router.get(
  '/search',
  rateLimit(100, 60), // 100 requests per minute
  validateSearch,
  lostItemController.searchLostItems.bind(lostItemController),
);

/**
 * @swagger
 * /api/lost-items/my:
 *   get:
 *     summary: Get current user's lost items
 *     tags: [Lost Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: User's lost items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LostItem'
 */
router.get(
  '/my',
  authenticate,
  rateLimit(60, 60), // 60 requests per minute
  lostItemController.getUserLostItems.bind(lostItemController),
);

/**
 * @swagger
 * /api/lost-items/{id}:
 *   get:
 *     summary: Get a specific lost item
 *     tags: [Lost Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lost item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LostItemResponse'
 *       404:
 *         description: Lost item not found
 */
router.get(
  '/:id',
  rateLimit(120, 60), // 120 requests per minute
  lostItemController.getLostItem.bind(lostItemController),
);

/**
 * @swagger
 * /api/lost-items/{id}/status:
 *   patch:
 *     summary: Update lost item status
 *     tags: [Lost Items]
 *     security:
 *       - bearerAuth: []
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
 *                 $ref: '#/components/schemas/ItemStatus'
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LostItemResponse'
 *       404:
 *         description: Lost item not found
 */
router.patch(
  '/:id/status',
  authenticate,
  rateLimit(20, 60), // 20 requests per minute
  lostItemController.updateLostItemStatus.bind(lostItemController),
);

export default router;

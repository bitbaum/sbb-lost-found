'use client';

import { useState, useEffect, useCallback } from 'react';
import { StaffHeader } from '@/components/staff/StaffHeader';
import { NotificationCard } from '@/components/staff/NotificationCard';
import { StaffStatusBar } from '@/components/staff/StaffStatusBar';
import type { StaffNotification, NotificationStatus } from '@/lib/types';
import { mockStaffNotifications, mockStaff, mockVehicle } from '@/lib/mock-data';
import { config } from '@/lib/config';
import { UI_LABELS } from '@/lib/labels';

export default function StaffPage() {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [showNewNotification, setShowNewNotification] = useState(false);

  useEffect(() => {
    // Simulate loading notifications
    const timer = setTimeout(() => {
      setNotifications(mockStaffNotifications);
      setIsLoading(false);
    }, config.demo.mockDelay);

    return () => clearTimeout(timer);
  }, []);

  // Simulate incoming notification for demo
  useEffect(() => {
    if (!config.demo.autoNotify) return;

    const demoTimer = setTimeout(() => {
      setShowNewNotification(true);

      const newNotification: StaffNotification = {
        id: `notif-${Date.now()}`,
        lostItemId: 'lost-demo',
        staffId: mockStaff.id,
        vehicleId: mockVehicle.id,
        status: 'pending',
        message: 'Schwarze Laptop-Tasche',
        priority: 'urgent',
        location: 'Wagen 7, Platz 45',
        createdAt: new Date().toISOString(),
        category: 'bags',
        passengerInfo: {
          tripRoute: 'Zürich HB → Bern',
          tripTime: '14:32',
          seatInfo: 'Wagen 7, Platz 45',
        },
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Play notification sound (if available)
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }, config.timing.demoNotificationDelay);

    return () => clearTimeout(demoTimer);
  }, []);

  const handleUpdateStatus = useCallback(
    async (notificationId: string, status: NotificationStatus, notes?: string) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, config.demo.mockDelay));

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                status,
                respondedAt: new Date().toISOString(),
                response: notes ? { notes, foundItem: status === 'found' } : undefined,
              }
            : n,
        ),
      );
    },
    [],
  );

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return n.status === 'pending' || n.status === 'acknowledged';
    return n.status === 'found' || n.status === 'not_found';
  });

  const pendingCount = notifications.filter(
    (n) => n.status === 'pending' || n.status === 'acknowledged',
  ).length;

  return (
    <div className="min-h-screen bg-app-milk">
      {/* Status Bar */}
      <StaffStatusBar vehicle={mockVehicle} pendingCount={pendingCount} isOnline={true} />

      {/* Header */}
      <StaffHeader staff={mockStaff} vehicle={mockVehicle} />

      {/* Filter Tabs */}
      <div className="sticky top-0 bg-white z-10 border-b border-app-cloud">
        <div className="flex px-4" role="tablist" aria-label="Meldungsfilter">
          {[
            { id: 'all', label: UI_LABELS.staff.tabAll, count: notifications.length },
            { id: 'pending', label: UI_LABELS.staff.tabOpen, count: pendingCount },
            {
              id: 'resolved',
              label: UI_LABELS.staff.tabResolved,
              count: notifications.length - pendingCount,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeFilter === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={`
                flex-1 py-3 px-2 text-app-sm font-medium border-b-2 transition-colors
                ${
                  activeFilter === tab.id
                    ? 'text-brand border-brand'
                    : 'text-app-granite border-transparent hover:text-app-charcoal'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`
                  ml-1.5 px-1.5 py-0.5 rounded-full text-app-xs
                  ${
                    activeFilter === tab.id
                      ? 'bg-brand text-white'
                      : 'bg-app-cloud text-app-granite'
                  }
                `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <main className="p-4 pb-20 space-y-3">
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-app p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-app-cloud rounded-app-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-app-cloud rounded w-3/4" />
                    <div className="h-3 bg-app-cloud rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="text-5xl mb-4">{activeFilter === 'pending' ? '✅' : '📭'}</div>
            <h3 className="text-app-lg font-semibold text-app-charcoal mb-2">
              {activeFilter === 'pending'
                ? UI_LABELS.staff.noOpenReports
                : UI_LABELS.staff.noReports}
            </h3>
            <p className="text-app-sm text-app-granite">
              {activeFilter === 'pending'
                ? UI_LABELS.staff.allProcessed
                : UI_LABELS.staff.noLostReports}
            </p>
          </div>
        ) : (
          // Notification cards
          filteredNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onUpdateStatus={handleUpdateStatus}
              isNew={index === 0 && showNewNotification && notification.status === 'pending'}
            />
          ))
        )}
      </main>

      {/* Incoming Notification Alert */}
      {showNewNotification && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 animate-fade-in">
          <div className="bg-white rounded-app-lg shadow-xl mx-4 max-w-sm w-full animate-slide-down overflow-hidden">
            <div className="bg-gradient-to-r from-brand to-brand-hover text-white p-4 text-center">
              <div className="text-4xl mb-2">🚨</div>
              <h3 className="text-lg font-semibold">{UI_LABELS.staff.newLostReport}</h3>
            </div>
            <div className="p-4">
              <p className="text-app-base text-app-charcoal font-medium mb-1">
                Schwarze Laptop-Tasche
              </p>
              <p className="text-app-sm text-app-granite mb-4">
                Wagen 7, Platz 45 • Zürich HB → Bern
              </p>
              <button
                onClick={() => setShowNewNotification(false)}
                className="btn-app-primary w-full"
              >
                {UI_LABELS.staff.viewReport}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

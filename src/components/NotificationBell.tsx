import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ref, onValue, update } from 'firebase/database';
import { auth, db } from '../config/firebase';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export default function NotificationBell() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      const notificationList: Notification[] = [];
      
      if (data) {
        Object.keys(data).forEach((key) => {
          notificationList.push({ id: key, ...data[key] });
        });
      }
      
      notificationList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  };

  const markAsRead = async (notificationId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const notificationRef = ref(db, `notifications/${currentUser.uid}/${notificationId}`);
    await update(notificationRef, { read: true });
  };

  const markAllAsRead = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    for (const notification of notifications) {
      if (!notification.read) {
        const notificationRef = ref(db, `notifications/${currentUser.uid}/${notification.id}`);
        await update(notificationRef, { read: true });
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ride_accepted': return '✅';
      case 'ride_completed': return '🏁';
      case 'ride_cancelled': return '❌';
      case 'driver_arrived': return '🚗';
      default: return '📢';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const NotificationModal = () => (
    <Modal
      visible={showModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.notificationItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !item.read && { backgroundColor: colors.primary + '10' }
                ]}
                onPress={() => {
                  markAsRead(item.id);
                  // Handle navigation based on notification type if needed
                }}
              >
                <Text style={styles.notificationIcon}>{getNotificationIcon(item.type)}</Text>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.notificationBody, { color: colors.textSecondary }]}>
                    {item.body}
                  </Text>
                  <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No notifications yet
                </Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.bellButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <NotificationModal />
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 20,
    fontWeight: '600',
  },
  markAllBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 12,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
  },
});
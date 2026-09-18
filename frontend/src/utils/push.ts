import client from '../api/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Trình duyệt của bạn không hỗ trợ thông báo đẩy');
        return false;
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        console.error('Thiếu cấu hình VITE_VAPID_PUBLIC_KEY trong môi trường (.env)');
        alert('Lỗi cấu hình hệ thống thông báo');
        return false;
    }

    try {
        await navigator.serviceWorker.register('/sw.js');
        const registration = await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert('Bạn cần cấp quyền thông báo trong cài đặt trình duyệt để nhận nhắc nhở học tập');
            return false;
        }

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
            });
        }

        const json = subscription.toJSON();
        await client.post('/reminders/push/subscribe', {
            endpoint: json.endpoint,
            keys: json.keys,
        });

        alert('Đã đăng ký nhận thông báo thành công!');
        return true;
    } catch (err: any) {
        console.error('Lỗi khi đăng ký Web Push Notification:', err);
        alert(err.response?.data?.message ?? 'Có lỗi xảy ra khi kích hoạt thông báo');
        return false;
    }
}
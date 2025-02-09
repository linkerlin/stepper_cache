import app from 'flarum/forum/app';

app.initializers.add('halomaster/stepper-cache', () => {
    // 监听Service Worker消息
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data.type === 'CACHE_UPDATED') {
                console.log('[Stepper Cache] Cache updated:', event.data.url);
            }
        });

        // 添加缓存状态检查
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.ready;
                const caches = await window.caches.keys();
                
                console.log('[Stepper Cache] Active caches:', caches);
                console.log('[Stepper Cache] Service Worker status:', registration.active ? 'active' : 'inactive');
            } catch (error) {
                console.error('[Stepper Cache] Status check failed:', error);
            }
        });
    }

    // 添加调试功能到window对象
    window.stepperCache = {
        // 清除所有缓存
        clearAll: async () => {
            try {
                const cacheKeys = await caches.keys();
                await Promise.all(
                    cacheKeys
                        .filter(key => key.startsWith('stepper-'))
                        .map(key => caches.delete(key))
                );
                console.log('[Stepper Cache] All caches cleared');
            } catch (error) {
                console.error('[Stepper Cache] Failed to clear caches:', error);
            }
        },

        // 获取缓存统计信息
        getStats: async () => {
            try {
                const stats = {
                    caches: {},
                    totalSize: 0
                };

                const cacheKeys = await caches.keys();
                for (const key of cacheKeys.filter(k => k.startsWith('stepper-'))) {
                    const cache = await caches.open(key);
                    const requests = await cache.keys();
                    stats.caches[key] = requests.length;
                }

                console.log('[Stepper Cache] Cache stats:', stats);
                return stats;
            } catch (error) {
                console.error('[Stepper Cache] Failed to get cache stats:', error);
                return null;
            }
        }
    };
});
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `stepper-static-${CACHE_VERSION}`;
const RESPONSE_CACHE = `stepper-response-${CACHE_VERSION}`;
const CACHE_DURATION = 28 * 60 * 60 * 1000; // 28 hours in milliseconds

// 需要缓存的静态资源类型
const STATIC_EXTENSIONS = [
    '.css', '.js', '.woff2', '.woff', '.ttf', '.eot', '.png', '.jpg', 
    '.jpeg', '.gif', '.svg', '.ico'
];

// 判断是否为静态资源
function isStaticResource(url) {
    return STATIC_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext));
}

// 判断是否为写操作请求
function isWriteRequest(request) {
    return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
}

// 判断缓存是否过期
function isCacheExpired(cachedResponse) {
    const dateHeader = cachedResponse.headers.get('date');
    if (!dateHeader) return true;
    
    const cachedDate = new Date(dateHeader).getTime();
    return Date.now() - cachedDate > CACHE_DURATION;
}

// 异步刷新缓存
async function refreshCache(request, cacheName) {
    try {
        const response = await fetch(request.clone());
        const cache = await caches.open(cacheName);
        await cache.put(request, response);
    } catch (error) {
        console.error('Cache refresh failed:', error);
    }
}

// 获取页面中的所有静态资源URL
async function extractStaticUrls(response) {
    const text = await response.clone().text();
    const staticUrls = new Set();
    
    // 提取<link>标签中的资源
    const linkMatches = text.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/g) || [];
    linkMatches.forEach(match => {
        const url = match.match(/href=["']([^"']+)["']/)?.[1];
        if (url && isStaticResource(url)) {
            staticUrls.add(new URL(url, location.origin).href);
        }
    });
    
    // 提取<script>标签中的资源
    const scriptMatches = text.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
    scriptMatches.forEach(match => {
        const url = match.match(/src=["']([^"']+)["']/)?.[1];
        if (url && isStaticResource(url)) {
            staticUrls.add(new URL(url, location.origin).href);
        }
    });
    
    // 提取<img>标签中的资源
    const imgMatches = text.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
    imgMatches.forEach(match => {
        const url = match.match(/src=["']([^"']+)["']/)?.[1];
        if (url && isStaticResource(url)) {
            staticUrls.add(new URL(url, location.origin).href);
        }
    });
    
    return Array.from(staticUrls);
}

// Service Worker安装事件
self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE),
            caches.open(RESPONSE_CACHE)
        ])
    );
});

// Service Worker激活事件
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => 
                        cacheName.startsWith('stepper-') && 
                        !cacheName.endsWith(CACHE_VERSION)
                    )
                    .map(cacheName => caches.delete(cacheName))
            );
        })
    );
});

// 拦截请求
self.addEventListener('fetch', event => {
    const request = event.request;
    
    // 忽略写操作请求
    if (isWriteRequest(request)) {
        return;
    }
    
    event.respondWith(
        (async function() {
            const url = new URL(request.url);
            const cacheName = isStaticResource(url.pathname) ? 
                STATIC_CACHE : RESPONSE_CACHE;
            
            // 尝试从缓存中获取响应
            const cachedResponse = await caches.match(request);
            
            if (cachedResponse) {
                // 检查缓存是否过期
                if (isCacheExpired(cachedResponse)) {
                    // 异步刷新缓存
                    refreshCache(request, cacheName);
                }
                return cachedResponse;
            }
            
            // 如果缓存中没有，发起网络请求
            try {
                const response = await fetch(request);
                
                if (!response || response.status !== 200) {
                    return response;
                }
                
                // 缓存响应
                const clonedResponse = response.clone();
                const cache = await caches.open(cacheName);
                cache.put(request, clonedResponse);
                
                // 如果是HTML响应，提取并缓存静态资源
                if (response.headers.get('content-type')?.includes('text/html')) {
                    const staticUrls = await extractStaticUrls(response);
                    const staticCache = await caches.open(STATIC_CACHE);
                    
                    staticUrls.forEach(async url => {
                        try {
                            const staticResponse = await fetch(url);
                            if (staticResponse.ok) {
                                staticCache.put(url, staticResponse);
                            }
                        } catch (error) {
                            console.error('Failed to cache static resource:', url);
                        }
                    });
                }
                
                return response;
                
            } catch (error) {
                // 如果网络请求失败，返回缓存的响应（如果有的话）
                if (cachedResponse) {
                    return cachedResponse;
                }
                throw error;
            }
        })()
    );
});
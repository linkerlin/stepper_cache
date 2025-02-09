<?php

namespace Stepper\Cache\Listeners;

use Flarum\Frontend\Document;
use Illuminate\Support\Str;

class AddAssets
{
    public function __invoke(Document $document)
    {
        // 这里可以添加更多的调试信息
        $document->head[] = '<script>
            if ("serviceWorker" in navigator) {
                window.addEventListener("load", function() {
                    navigator.serviceWorker.register("/sw.js", {
                        scope: "/"
                    }).then(function(registration) {
                        console.log("[Stepper Cache] ServiceWorker registration successful with scope:", registration.scope);
                    }).catch(function(err) {
                        console.error("[Stepper Cache] ServiceWorker registration failed:", err);
                    });
                });
            } else {
                console.warn("[Stepper Cache] ServiceWorker is not supported in this browser");
            }
        </script>';

        // 可以添加一个注释标记表明这是由我们的插件注入的
        $document->head[] = '<!-- Stepper Cache Plugin -->';
    }
}
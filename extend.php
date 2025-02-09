<?php

use Flarum\Extend;
use Stepper\Cache\Listeners\AddAssets;
use Laminas\Diactoros\Response\TextResponse;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->content(AddAssets::class),

    // 添加service worker路由
    (new Extend\Routes('forum'))
        ->get('/sw.js', 'stepper-cache.service-worker', function () {
            $content = file_get_contents(__DIR__ . '/js/dist/serviceWorker.js');
            return new TextResponse(
                $content,
                200,
                ['Content-Type' => 'application/javascript']
            );
        })
];
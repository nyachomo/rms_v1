<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Zoom Server-to-Server OAuth (for creating/deleting meetings via API)
    | Create a "Server-to-Server OAuth" app at https://marketplace.zoom.us
    |--------------------------------------------------------------------------
    */
    'account_id'    => env('ZOOM_ACCOUNT_ID', ''),
    'client_id'     => env('ZOOM_CLIENT_ID', ''),
    'client_secret' => env('ZOOM_CLIENT_SECRET', ''),

    /*
    |--------------------------------------------------------------------------
    | Zoom Meeting SDK (for embedding meetings in-browser)
    | Create a "Meeting SDK" app at https://marketplace.zoom.us
    |--------------------------------------------------------------------------
    */
    'sdk_key'       => env('ZOOM_SDK_KEY', ''),
    'sdk_secret'    => env('ZOOM_SDK_SECRET', ''),

    /*
    |--------------------------------------------------------------------------
    | Host email — meetings are created under this Zoom account
    |--------------------------------------------------------------------------
    */
    'host_email'    => env('ZOOM_HOST_EMAIL', 'info@techsphereinstitute.co.ke'),
];

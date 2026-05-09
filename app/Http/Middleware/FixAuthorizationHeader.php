<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * On cPanel with PHP-FPM, Apache may not populate $_SERVER['HTTP_AUTHORIZATION'].
 * This middleware checks every known fallback location and injects the header
 * onto the request before Sanctum's token guard runs.
 */
class FixAuthorizationHeader
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->hasHeader('Authorization')) {
            $auth = $this->findAuthorizationHeader($request);

            if ($auth) {
                $request->headers->set('Authorization', $auth);
                $_SERVER['HTTP_AUTHORIZATION'] = $auth;
            }
        }

        return $next($request);
    }

    private function findAuthorizationHeader(Request $request): ?string
    {
        // 1. Standard PHP variable (mod_php)
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }

        // 2. Set by mod_rewrite E= flag (common on cPanel)
        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        // 3. Some CGI/FastCGI setups use this key
        if (!empty($_SERVER['Authorization'])) {
            return $_SERVER['Authorization'];
        }

        // 4. getallheaders() — works on Apache+PHP-FPM when CGIPassAuth is On
        if (function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strtolower($name) === 'authorization') {
                    return $value;
                }
            }
        }

        // 5. apache_request_headers() alias
        if (function_exists('apache_request_headers')) {
            foreach (apache_request_headers() as $name => $value) {
                if (strtolower($name) === 'authorization') {
                    return $value;
                }
            }
        }

        // 6. X-Authorization custom header — Apache does not strip custom headers.
        $xAuth = $request->header('X-Authorization');
        if ($xAuth) {
            return $xAuth;
        }

        // 7. HttpOnly api_token cookie — set by login/register response.
        //    Cookies survive Apache's header stripping entirely. This is the
        //    most reliable fallback on cPanel/shared hosting.
        if (!empty($_COOKIE['api_token'])) {
            return 'Bearer ' . $_COOKIE['api_token'];
        }

        return null;
    }
}

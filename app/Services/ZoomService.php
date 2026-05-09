<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZoomService
{
    private string $accountId;
    private string $clientId;
    private string $clientSecret;
    private string $sdkKey;
    private string $sdkSecret;
    private string $hostEmail;

    public function __construct()
    {
        $this->accountId    = config('zoom.account_id');
        $this->clientId     = config('zoom.client_id');
        $this->clientSecret = config('zoom.client_secret');
        $this->sdkKey       = config('zoom.sdk_key');
        $this->sdkSecret    = config('zoom.sdk_secret');
        $this->hostEmail    = config('zoom.host_email');
    }

    /* ── OAuth access token (cached for ~58 min) ── */
    private function accessToken(): string
    {
        return Cache::remember('zoom_oauth_token', 3500, function () {
            $response = Http::withBasicAuth($this->clientId, $this->clientSecret)
                ->asForm()
                ->post('https://zoom.us/oauth/token', [
                    'grant_type' => 'account_credentials',
                    'account_id' => $this->accountId,
                ]);

            $token = $response->json('access_token', '');

            if (!$token) {
                Log::error('Zoom OAuth failed', $response->json() ?? []);
            }

            return $token;
        });
    }

    /* ── Create a recurring (no fixed time) meeting ── */
    public function createMeeting(string $topic, int $duration = 60): array
    {
        $response = Http::withToken($this->accessToken())
            ->post("https://api.zoom.us/v2/users/{$this->hostEmail}/meetings", [
                'topic'    => $topic,
                'type'     => 3,          // Recurring meeting, no fixed time
                'duration' => $duration,
                'settings' => [
                    'join_before_host'  => true,
                    'participant_video' => true,
                    'host_video'        => true,
                    'mute_upon_entry'   => false,
                    'waiting_room'      => false,
                    'audio'             => 'voip',
                ],
            ]);

        return $response->json() ?? [];
    }

    /* ── Delete a meeting ── */
    public function deleteMeeting(string $meetingId): bool
    {
        $response = Http::withToken($this->accessToken())
            ->delete("https://api.zoom.us/v2/meetings/{$meetingId}");

        return $response->successful();
    }

    /* ── Generate Meeting SDK JWT signature ── */
    public function generateSignature(string $meetingNumber, int $role = 0): string
    {
        $iat = time() - 30;
        $exp = $iat + 7200; // valid for 2 hours

        $header  = $this->b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = $this->b64url(json_encode([
            'sdkKey'   => $this->sdkKey,
            'appKey'   => $this->sdkKey,
            'mn'       => $meetingNumber,
            'role'     => $role,
            'iat'      => $iat,
            'exp'      => $exp,
            'tokenExp' => $exp,
        ]));

        $sig = $this->b64url(hash_hmac('sha256', "{$header}.{$payload}", $this->sdkSecret, true));

        return "{$header}.{$payload}.{$sig}";
    }

    public function getSdkKey(): string   { return $this->sdkKey; }
    public function getHostEmail(): string { return $this->hostEmail; }

    private function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}

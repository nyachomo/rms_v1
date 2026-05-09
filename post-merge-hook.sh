#!/bin/bash
# Copy this file to .git/hooks/post-merge on the cPanel server
# and make it executable: chmod +x .git/hooks/post-merge
#
# It runs automatically after every `git pull` and clears all caches.

echo "=== Running post-merge hook ==="
php artisan optimize:clear
php artisan migrate --force
echo "=== Done ==="

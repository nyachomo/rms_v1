import axios from 'axios';
window.axios = axios;
window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Always send cookies (including the HttpOnly api_token set on login) with every
// request. Apache never strips cookies, so FixAuthorizationHeader can reconstruct
// the Authorization header from the cookie on cPanel/shared hosting.
const _fetch = window.fetch.bind(window);
window.fetch = function (url, options = {}) {
    return _fetch(url, { ...options, credentials: 'include' });
};

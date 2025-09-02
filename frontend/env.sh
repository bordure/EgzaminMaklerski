#!/bin/sh
echo "window.RUNTIME_CONFIG = {" > /usr/share/nginx/html/env.js
echo "  VITE_API_URL: \"${VITE_API_URL}\"" >> /usr/share/nginx/html/env.js
echo "}" >> /usr/share/nginx/html/env.js
echo "Generated runtime env.js with VITE_API_URL=${VITE_API_URL}"

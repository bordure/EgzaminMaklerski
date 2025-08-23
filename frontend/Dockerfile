# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./ 
RUN npm install

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config and use custom if needed
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

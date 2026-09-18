# ============ STAGE 1: BUILD ============
FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Biến môi trường VITE_* phải có mặt LÚC BUILD (không phải lúc chạy container),
# vì Vite nhúng trực tiếp giá trị vào file JS tĩnh khi build - khác với biến môi
# trường backend (đọc lúc runtime qua process.env). Đây là điểm hay bị hiểu nhầm.
ARG VITE_API_URL
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_VAPID_PUBLIC_KEY=${VITE_VAPID_PUBLIC_KEY}

RUN npm run build

# ============ STAGE 2: SERVE ============
# Chỉ cần Nginx để phục vụ file tĩnh đã build (thư mục dist/) - không cần Node.js
# nữa ở bước này, giúp image cuối cùng rất nhẹ (~vài chục MB thay vì vài trăm MB).
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

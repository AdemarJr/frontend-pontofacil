# Build CRA — REACT_APP_API_URL é injetado no bundle em tempo de build (EasyPanel: Build Arg)
FROM node:20-alpine AS build
WORKDIR /app

ARG REACT_APP_API_URL=https://api-homolog.pontofacil.digital
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV CI=true

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

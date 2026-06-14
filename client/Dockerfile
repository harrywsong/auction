FROM node:18-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

# Build-time args so Vite can bake them into the bundle
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_ADMIN_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_ADMIN_KEY=$VITE_ADMIN_KEY

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview"]

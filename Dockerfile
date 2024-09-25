FROM denoland/deno:alpine-1.28.0

EXPOSE 8000

WORKDIR /app

COPY . .

RUN deno cache app.js

CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "app.js"]

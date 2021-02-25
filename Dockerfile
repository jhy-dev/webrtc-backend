
FROM node:15.10.0-alpine3.10

WORKDIR /usr/src/app

COPY package.json .

COPY tsconfig.json .

RUN npm install --only=production 

COPY . .

RUN npx tsc

EXPOSE 5000

ENTRYPOINT ["node"];

CMD ["./dist/app.js"];


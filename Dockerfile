FROM node:22.13.1
WORKDIR /usr/app

COPY package.json /usr/app/
RUN npm i

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start"]

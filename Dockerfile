FROM btwiuse/arch:dev

COPY . /app

WORKDIR /app

RUN bun i

CMD bash entrypoint.sh

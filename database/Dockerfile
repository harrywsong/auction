# Dockerfile for PostgreSQL initialization (optional)
# Use this if you want to run migrations automatically on startup

FROM postgres:14-alpine

COPY database/migrations/*.sql /docker-entrypoint-initdb.d/

ENV POSTGRES_DB=auction_db
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

EXPOSE 5432

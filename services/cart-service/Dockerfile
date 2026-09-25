FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod .
COPY *.go .
RUN go mod tidy
RUN CGO_ENABLED=0 go build -o /out/service .

FROM alpine:3.20
RUN adduser -D -H appuser
COPY --from=build /out/service /service
USER appuser
EXPOSE 4003
ENTRYPOINT ["/service"]
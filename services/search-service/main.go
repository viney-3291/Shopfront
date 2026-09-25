package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

type Product struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Image       string  `json:"image"`
}

func productServiceURL() string {
	if v := os.Getenv("PRODUCT_SERVICE_URL"); v != "" {
		return v
	}
	return "http://product-service:4002"
}

var tracedClient = &http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}

func fetchProducts(ctx context.Context) ([]Product, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, productServiceURL()+"/products", nil)
	if err != nil {
		return nil, err
	}
	resp, err := tracedClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var products []Product
	if err := json.Unmarshal(body, &products); err != nil {
		return nil, err
	}
	return products, nil
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			return
		}
		h(w, r)
	}
}

func main() {
	shutdown := initTracer("search-service")
	defer shutdown()

	mux := http.NewServeMux()

	mux.HandleFunc("/health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok","service":"search-service"}`))
	}))

	mux.HandleFunc("/search", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
				products, err := fetchProducts(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusBadGateway)
			json.NewEncoder(w).Encode(map[string]string{"error": "product-service unavailable"})
			return
		}
		if q == "" {
			json.NewEncoder(w).Encode(products)
			return
		}
		var results []Product
		for _, p := range products {
			if strings.Contains(strings.ToLower(p.Name), q) ||
				strings.Contains(strings.ToLower(p.Description), q) ||
				strings.Contains(strings.ToLower(p.Category), q) {
				results = append(results, p)
			}
		}
		json.NewEncoder(w).Encode(results)
	}))

	handler := otelhttp.NewHandler(mux, "search-service")
	log.Println("search-service listening on :4012")
	log.Fatal(http.ListenAndServe(":4012", handler))
}

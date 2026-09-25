package main

import (
	"encoding/json"
	"log"
	"net/http"
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

var products = []Product{
	{"p1", "Aurora Wireless Headphones", "Electronics", 79.99, "Over-ear headphones with 30h battery life.", "/products/p1.svg"},
	{"p2", "Nimbus Mechanical Keyboard", "Electronics", 59.99, "Compact 65% keyboard with hot-swappable switches.", "/products/p2.svg"},
	{"p3", "Terra Ceramic Mug Set", "Home", 24.99, "Set of 4 handcrafted ceramic mugs.", "/products/p3.svg"},
	{"p4", "Pulse Fitness Tracker", "Fitness", 44.99, "Tracks steps, heart rate, and sleep.", "/products/p4.svg"},
	{"p5", "Drift Canvas Backpack", "Fashion", 54.50, "Water-resistant canvas backpack, 20L.", "/products/p5.svg"},
	{"p6", "Kindled Short Stories", "Books", 14.99, "A collection of 12 short stories.", "/products/p6.svg"},
	{"p7", "Glow Desk Lamp", "Home", 32.00, "Adjustable LED desk lamp with USB port.", "/products/p7.svg"},
	{"p8", "Vortex Yoga Mat", "Fitness", 29.99, "Non-slip 6mm yoga mat.", "/products/p8.svg"},
	{"p9", "Halo Sunglasses", "Fashion", 39.00, "Polarized UV400 sunglasses.", "/products/p9.svg"},
	{"p10", "Cobalt Water Bottle", "Home", 18.50, "Insulated 750ml stainless steel bottle.", "/products/p10.svg"},
	{"p11", "Pixel Art Notebook", "Books", 9.99, "Dot-grid notebook, 120 pages.", "/products/p11.svg"},
	{"p12", "Zephyr Running Shoes", "Fitness", 89.99, "Lightweight breathable running shoes.", "/products/p12.svg"},
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
		shutdown := initTracer("product-service")
		defer shutdown()
		
		mux := http.NewServeMux()

	mux.HandleFunc("/health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok","service":"product-service"}`))
	}))

	mux.HandleFunc("/products", withCORS(func(w http.ResponseWriter, r *http.Request) {
		q := strings.ToLower(r.URL.Query().Get("category"))
		if q == "" {
			json.NewEncoder(w).Encode(products)
			return
		}
		var filtered []Product
		for _, p := range products {
			if strings.ToLower(p.Category) == q {
				filtered = append(filtered, p)
			}
		}
		json.NewEncoder(w).Encode(filtered)
	}))

	mux.HandleFunc("/products/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/products/")
		for _, p := range products {
			if p.ID == id {
				json.NewEncoder(w).Encode(p)
				return
			}
		}
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "product not found"})
	}))

	handler := otelhttp.NewHandler(mux, "product-service")
	log.Println("product-service listening on :4002")
	log.Fatal(http.ListenAndServe(":4002", handler))

}
// ci test
// trigger real build
// verify pipeline

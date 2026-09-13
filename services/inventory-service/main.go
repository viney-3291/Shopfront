package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
)

var (
	mu    sync.Mutex
	stock = map[string]int{
		"p1": 25, "p2": 40, "p3": 60, "p4": 15, "p5": 30,
		"p6": 100, "p7": 20, "p8": 50, "p9": 35, "p10": 70,
		"p11": 90, "p12": 12,
	}
)

type reserveRequest struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
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
	mux := http.NewServeMux()

	mux.HandleFunc("/health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok","service":"inventory-service"}`))
	}))

	mux.HandleFunc("/inventory/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/inventory/")
		mu.Lock()
		defer mu.Unlock()
		qty, ok := stock[id]
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "unknown product"})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"productId": id, "stock": qty})
	}))

	mux.HandleFunc("/inventory/reserve", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req reserveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Quantity <= 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
			return
		}
		mu.Lock()
		defer mu.Unlock()
		qty, ok := stock[req.ProductID]
		if !ok || qty < req.Quantity {
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]interface{}{"reserved": false, "available": qty})
			return
		}
		stock[req.ProductID] -= req.Quantity
		json.NewEncoder(w).Encode(map[string]interface{}{"reserved": true, "remaining": stock[req.ProductID]})
	}))

	mux.HandleFunc("/inventory/release", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req reserveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Quantity <= 0 {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
			return
		}
		mu.Lock()
		defer mu.Unlock()
		stock[req.ProductID] += req.Quantity
		json.NewEncoder(w).Encode(map[string]interface{}{"released": true, "remaining": stock[req.ProductID]})
	}))

	log.Println("inventory-service listening on :4004")
	log.Fatal(http.ListenAndServe(":4004", mux))
}

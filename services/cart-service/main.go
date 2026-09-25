package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

type CartItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type Cart struct {
	UserID string     `json:"userId"`
	Items  []CartItem `json:"items"`
}

var rdb *RedisClient

func cartKey(userID string) string {
	return "cart:" + userID
}

func loadCart(userID string) Cart {
	cart := Cart{UserID: userID, Items: []CartItem{}}
	val, isNil, err := rdb.Get(cartKey(userID))
	if err != nil || isNil {
		return cart
	}
	json.Unmarshal([]byte(val), &cart.Items)
	return cart
}

func saveCart(userID string, items []CartItem) error {
	b, err := json.Marshal(items)
	if err != nil {
		return err
	}
	return rdb.Set(cartKey(userID), string(b))
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			return
		}
		h(w, r)
	}
}

func main() {
	shutdown := initTracer("cart-service")
	defer shutdown()

	rdb = NewRedisClient()
	mux := http.NewServeMux()

	mux.HandleFunc("/health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		status := "ok"
		if err := rdb.Ping(); err != nil {
			status = "degraded (redis unreachable)"
		}
		json.NewEncoder(w).Encode(map[string]string{"status": status, "service": "cart-service"})
	}))

	// /cart/{userId}
	mux.HandleFunc("/cart/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/cart/")
		parts := strings.Split(path, "/")
		userID := parts[0]
		if userID == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "userId required"})
			return
		}

		switch r.Method {
		case http.MethodGet:
			cart := loadCart(userID)
			json.NewEncoder(w).Encode(cart)

		case http.MethodPost:
			var item CartItem
			if err := json.NewDecoder(r.Body).Decode(&item); err != nil || item.ProductID == "" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": "invalid item"})
				return
			}
			if item.Quantity <= 0 {
				item.Quantity = 1
			}
			cart := loadCart(userID)
			found := false
			for i, it := range cart.Items {
				if it.ProductID == item.ProductID {
					cart.Items[i].Quantity += item.Quantity
					found = true
					break
				}
			}
			if !found {
				cart.Items = append(cart.Items, item)
			}
			saveCart(userID, cart.Items)
			json.NewEncoder(w).Encode(cart)

		case http.MethodDelete:
			if len(parts) > 1 && parts[1] != "" {
				productID := parts[1]
				cart := loadCart(userID)
				var newItems []CartItem
				for _, it := range cart.Items {
					if it.ProductID != productID {
						newItems = append(newItems, it)
					}
				}
				saveCart(userID, newItems)
				cart.Items = newItems
				json.NewEncoder(w).Encode(cart)
				return
			}
			rdb.Del(cartKey(userID))
			json.NewEncoder(w).Encode(map[string]string{"status": "cleared"})

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	handler := otelhttp.NewHandler(mux, "cart-service")
	log.Println("cart-service listening on :4003")
	log.Fatal(http.ListenAndServe(":4003", handler))
}

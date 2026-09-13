import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../CartContext.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], average: 0, count: 0 });
  const [recs, setRecs] = useState([]);
  const [message, setMessage] = useState("");
  const [reviewForm, setReviewForm] = useState({ userName: "", rating: 5, comment: "" });

  useEffect(() => {
    setMessage("");
    api.getProduct(id).then(setProduct).catch((e) => setMessage(e.message));
    api.getReviews(id).then(setReviews).catch(() => {});
    api
      .getRecommendations(id)
      .then((r) => setRecs(r.recommendations || []))
      .catch(() => {});
  }, [id]);

  const handleAddToCart = async () => {
    try {
      await addItem(id, 1);
      setMessage("Added to cart.");
    } catch (e) {
      setMessage(e.message);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await api.addReview(id, reviewForm);
      const updated = await api.getReviews(id);
      setReviews(updated);
      setReviewForm({ userName: "", rating: 5, comment: "" });
    } catch (e) {
      setMessage(e.message);
    }
  };

  if (!product) return <p>{message || "Loading..."}</p>;

  return (
    <div className="product-detail">
      <div className="product-main">
        <img src={product.image} alt={product.name} className="product-image" />
        <div>
          <h2>{product.name}</h2>
          <p className="category">{product.category}</p>
          <p className="price large">${product.price.toFixed(2)}</p>
          <p>{product.description}</p>
          <p className="rating">
            {reviews.count > 0 ? `★ ${reviews.average} (${reviews.count} reviews)` : "No reviews yet"}
          </p>
          {user ? (
            <button onClick={handleAddToCart}>Add to Cart</button>
          ) : (
            <p>
              <Link to="/login">Log in</Link> to add this to your cart.
            </p>
          )}
          {message && <p className="info">{message}</p>}
        </div>
      </div>

      {recs.length > 0 && (
        <section>
          <h3>You might also like</h3>
          <div className="grid small">
            {recs.map((r) => (
              <Link to={`/product/${r.id}`} key={r.id} className="card">
                <img src={r.image} alt={r.name} />
                <div className="card-body">
                  <h4>{r.name}</h4>
                  <p className="price">${r.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3>Reviews</h3>
        {reviews.reviews.map((r) => (
          <div key={r.id} className="review">
            <strong>{r.userName}</strong> — {"★".repeat(r.rating)}
            <p>{r.comment}</p>
          </div>
        ))}

        <form className="review-form" onSubmit={submitReview}>
          <h4>Leave a review</h4>
          <input
            placeholder="Your name"
            value={reviewForm.userName}
            onChange={(e) => setReviewForm({ ...reviewForm, userName: e.target.value })}
            required
          />
          <select
            value={reviewForm.rating}
            onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Comment (optional)"
            value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
          />
          <button type="submit">Submit review</button>
        </form>
      </section>
    </div>
  );
}

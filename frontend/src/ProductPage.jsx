
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProductPage.css";

export default function ProductPage({
  products = [],
  onAddToCart,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Get product ID directly from URL: /product/1
  const id = Number(location.pathname.split("/")[2]);

  // Find product in catalog
  const product = products.find(
    (item) => Number(item.id) === id
  );

  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [notification, setNotification] = useState("");

  // Product not found
  if (!product) {
    return (
      <main className="shoe-not-found">
        <h1>Product Not Found</h1>
        <p>
          The product you are looking for does not exist.
        </p>

        <button
          type="button"
          onClick={() => navigate("/shop")}
        >
          Back to Shop →
        </button>
      </main>
    );
  }

  // Product gallery
  const images = [
    product.image,
    ...(product.images || []),
  ].filter(
    (image, index, array) =>
      image && array.indexOf(image) === index
  );

  // Available shoe sizes
  const sizes = [
    7, 8, 8.5, 9, 9.5, 10, 11, 12,
  ];

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(10, current + 1));
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  // Add product to cart
  const addToCart = () => {
    if (selectedSize === null) {
      setNotification("Please select your shoe size.");
      return;
    }

    onAddToCart?.({
      ...product,
      size: selectedSize,
      quantity,
    });

    setNotification("Product added to cart successfully!");
  };

  // Redirect to demo checkout
  const buyNow = () => {
    if (selectedSize === null) {
      setNotification("Please select your shoe size.");
      return;
    }

    const selectedProduct = {
      ...product,
      size: selectedSize,
      quantity,
    };

    navigate("/checkout", {
      state: {
        product: selectedProduct,
        items: [selectedProduct],
      },
    });
  };

  return (
    <main className="shoe-product-page">
      {/* Breadcrumb */}
      <div className="shoe-breadcrumb">
        <button
          type="button"
          onClick={() => navigate("/shop")}
        >
          ← Back to Shop
        </button>

        <span> / {product.name}</span>
      </div>

      <div className="shoe-product-layout">
        {/* Product Gallery */}
        <section className="shoe-gallery">
          <div className="shoe-main-image">
            <img
              src={images[activeImage] || product.image}
              alt={product.name}
            />

            {product.badge && (
              <span className="shoe-product-badge">
                {product.badge}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          <div className="shoe-thumbnails">
            {images.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className={
                  activeImage === index ? "selected" : ""
                }
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${product.name} view ${index + 1}`}
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          <p className="shoe-gallery-caption">
            {images.length} product image
            {images.length !== 1 ? "s" : ""} available
          </p>
        </section>

        {/* Product Information */}
        <section className="shoe-product-info">
          <span className="shoe-label">
            PREMIUM FOOTWEAR
          </span>

          <h1>{product.name}</h1>

          <p className="shoe-brand">
            {product.brand || "Nike"} / {product.category}
          </p>

          {/* Rating */}
          <div className="shoe-rating">
            <span>★ {product.rating || "4.8"}</span>
            <span>Premium Selection</span>
          </div>

          {/* Price */}
          <div className="shoe-price">
            <strong>
              ${Number(product.price).toFixed(2)}
            </strong>

            {product.oldPrice && (
              <del>
                ${Number(product.oldPrice).toFixed(2)}
              </del>
            )}
          </div>

          {/* Description */}
          <p className="shoe-description">
            {product.description ||
              "Discover exceptional comfort, modern design, and everyday performance. Built for your next move. Premium materials and a timeless silhouette make this pair a perfect addition to your collection."}
          </p>

          {/* Product Details */}
          <div className="shoe-extra-info">
            <p>
              <strong>Brand:</strong> {product.brand}
            </p>

            <p>
              <strong>Category:</strong> {product.category}
            </p>

            <p>
              <strong>Color:</strong> {product.color}
            </p>

            <p>
              <strong>Availability:</strong>{" "}
              <span style={{ color: "#b7ff35" }}>
                Available in Demo Store
              </span>
            </p>
          </div>

          {/* Size Selection */}
          <div className="shoe-size-header">
            <h3>Select Size</h3>
            <span>US Sizes</span>
          </div>

          <div className="shoe-size-grid">
            {sizes.map((size) => (
              <button
                type="button"
                key={size}
                className={
                  selectedSize === size ? "active" : ""
                }
                onClick={() => {
                  setSelectedSize(size);
                  setNotification("");
                }}
                aria-pressed={selectedSize === size}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <h3>Quantity</h3>

          <div className="shoe-quantity">
            <button
              type="button"
              onClick={decreaseQuantity}
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={increaseQuantity}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Notification */}
          {notification && (
            <p
              role="status"
              style={{
                color: "#b7ff35",
                marginBottom: "15px",
              }}
            >
              {notification}
            </p>
          )}

          {/* Action Buttons */}
          <div className="shoe-actions">
            <button
              type="button"
              className="shoe-cart-btn"
              onClick={addToCart}
            >
              + Add to Cart
            </button>

            <button
              type="button"
              className="shoe-buy-btn"
              onClick={buyNow}
            >
              Buy Now →
            </button>
          </div>

          {/* Benefits */}
          <div className="shoe-benefits">
            <p>✓ Free shipping on orders over $150</p>
            <p>✓ 30-day demo returns</p>
            <p>✓ Secure demo checkout</p>
            <p>✓ No real payments are processed</p>
          </div>
        </section>
      </div>
    </main>
  );
}

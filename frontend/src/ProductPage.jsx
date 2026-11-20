import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProductPage.css";

const DEFAULT_SIZES = Array.from({ length: 11 }, (_, i) => i + 36);

export default function ProductPage({ products = [], onAddToCart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const id = location.pathname.split("/")[2];

  const product = products.find(
    (item) => String(item.id) === String(id)
  );

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    setSelectedSize(null);
    setSelectedColor("");
    setQuantity(1);
    setActiveImage(0);
    setNotification("");
  }, [id]);

  if (!product) {
    return (
      <main className="shoe-not-found">
        <h1>Product Not Found</h1>
        <p>The product you are looking for does not exist.</p>
        <button onClick={() => navigate("/shop")}>
          Back to Shop →
        </button>
      </main>
    );
  }

  const images = [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
  ].filter((image, index, array) =>
    image && array.indexOf(image) === index
  );

  const sizes = Array.isArray(product.sizes) && product.sizes.length
    ? product.sizes
    : DEFAULT_SIZES;

  const colors = Array.isArray(product.colors) && product.colors.length
    ? product.colors
    : [product.color || "Default"];

  const stock = Number.isFinite(Number(product.stock))
    ? Math.max(0, Number(product.stock))
    : 10;

  const maxQuantity = Math.min(10, stock);
  const outOfStock = stock === 0;

  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;

  const discount = oldPrice > price && price > 0
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0;

  const changeImage = (direction) => {
    if (!images.length) return;

    setActiveImage((current) =>
      (current + direction + images.length) % images.length
    );
  };

  const createCartItem = () => {
    if (outOfStock) {
      setNotification("This product is out of stock.");
      return null;
    }

    if (selectedSize === null) {
      setNotification("Please select your EU shoe size.");
      return null;
    }

    if (!selectedColor) {
      setNotification("Please select a color.");
      return null;
    }

    setNotification("");

    return {
      ...product,
      size: selectedSize,
      sizeSystem: "EU",
      color: selectedColor,
      quantity,
    };
  };

  const addToCart = () => {
    const item = createCartItem();
    if (!item) return;

    if (typeof onAddToCart !== "function") {
      setNotification("Cart is temporarily unavailable.");
      return;
    }

    onAddToCart(item);
    setNotification("Product added to cart successfully!");
  };

  const buyNow = () => {
    const item = createCartItem();
    if (!item) return;

    navigate("/checkout", {
      state: {
        product: item,
        items: [item],
      },
    });
  };

  return (
    <main className="shoe-product-page">
      <div className="shoe-breadcrumb">
        <button type="button" onClick={() => navigate("/shop")}>
          ← Back to Shop
        </button>
        <span> / {product.name}</span>
      </div>

      <div className="shoe-product-layout">
        <section className="shoe-gallery">
          <div className="shoe-main-image">
            {images.length > 0 && (
              <img
                src={images[activeImage] || images[0]}
                alt={`${product.name} - image ${activeImage + 1}`}
              />
            )}

            {product.badge && (
              <span className="shoe-product-badge">
                {product.badge}
              </span>
            )}

            {discount > 0 && (
              <span className="shoe-discount-badge">
                -{discount}%
              </span>
            )}

            {images.length > 1 && (
              <div className="shoe-gallery-controls">
                <button
                  type="button"
                  onClick={() => changeImage(-1)}
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => changeImage(1)}
                  aria-label="Next image"
                >
                  →
                </button>
              </div>
            )}
          </div>

          <div className="shoe-thumbnails">
            {images.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className={activeImage === index ? "selected" : ""}
                onClick={() => setActiveImage(index)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={activeImage === index}
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
            {images.length === 1 ? "" : "s"} available
          </p>
        </section>

        <section className="shoe-product-info">
          <span className="shoe-label">PREMIUM FOOTWEAR</span>
          <h1>{product.name}</h1>

          <p className="shoe-brand">
            {product.brand || "Unknown Brand"} / {product.category}
          </p>

          <div className="shoe-rating">
            <span>★ {product.rating ?? "Not rated"}</span>
            <span>Premium Selection</span>
          </div>

          <div className="shoe-price">
            <strong>${price.toFixed(2)}</strong>
            {oldPrice > price && (
              <del>${oldPrice.toFixed(2)}</del>
            )}
          </div>

          <p className="shoe-description">
            {product.description ||
              "Discover exceptional comfort, modern design and everyday performance. Premium footwear designed for your next move."}
          </p>

          <div className="shoe-extra-info">
            <p><strong>Brand:</strong> {product.brand}</p>
            <p><strong>Category:</strong> {product.category}</p>
            <p>
              <strong>Availability:</strong>{" "}
              {outOfStock ? "Out of Stock" : "Available in Demo Store"}
            </p>
          </div>

          <div className="shoe-size-header">
            <h3>Select Size</h3>
            <span>EU Sizes 36–46</span>
          </div>

          <div className="shoe-size-grid">
            {sizes.map((size) => (
              <button
                type="button"
                key={size}
                className={selectedSize === size ? "active" : ""}
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

          <h3>Select Color</h3>
          <div className="shoe-color-grid">
            {colors.map((color) => (
              <button
                type="button"
                key={color}
                className={selectedColor === color ? "active" : ""}
                aria-pressed={selectedColor === color}
                onClick={() => {
                  setSelectedColor(color);
                  setNotification("");
                }}
              >
                {color}
              </button>
            ))}
          </div>

          <h3>Quantity</h3>
          <div className="shoe-quantity">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              disabled={quantity >= maxQuantity}
              onClick={() =>
                setQuantity((q) => Math.min(maxQuantity, q + 1))
              }
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <p className="shoe-selection-summary">
            {selectedSize ? `EU ${selectedSize}` : "No size selected"}
            {" · "}
            {selectedColor || "No color selected"}
            {" · "}
            {quantity} pair{quantity > 1 ? "s" : ""}
          </p>

          {notification && (
            <p className="shoe-notification" role="status">
              {notification}
            </p>
          )}

          <div className="shoe-actions">
            <button
              type="button"
              className="shoe-cart-btn"
              disabled={outOfStock}
              onClick={addToCart}
            >
              + Add to Cart
            </button>
            <button
              type="button"
              className="shoe-buy-btn"
              disabled={outOfStock}
              onClick={buyNow}
            >
              Buy Now →
            </button>
          </div>

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

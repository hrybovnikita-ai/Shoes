import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductModal from './ProductModal';
import AuthPage from "./AuthPage.jsx";
import './App.css';

const products = [
  {id:1,name:'Nike Air Max 270',brand:'Nike',category:'Running',price:150,oldPrice:185,image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',color:'Red',badge:'BESTSELLER',rating:4.9},
  {id:2,name:'Adidas Ultraboost',brand:'Adidas',category:'Running',price:180,oldPrice:220,image:'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900',color:'White',badge:'NEW',rating:4.8},
  {id:3,name:'Nike Air Jordan',brand:'Nike',category:'Lifestyle',price:210,oldPrice:250,image:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900',color:'Black',badge:'HOT',rating:4.9},
  {id:4,name:'New Balance Classic',brand:'New Balance',category:'Lifestyle',price:135,oldPrice:165,image:'https://images.unsplash.com/photo-1539185441755-769473a23570?w=900',color:'Grey',badge:'POPULAR',rating:4.7},
  {id:5,name:'Converse All Star',brand:'Converse',category:'Casual',price:85,oldPrice:110,image:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=900',color:'Black',badge:'CLASSIC',rating:4.8},
  {id:6,name:'Nike Street Edition',brand:'Nike',category:'Lifestyle',price:165,oldPrice:195,image:'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=900',color:'White',badge:'TRENDING',rating:4.6},
];
const categories = [
  {name:'Running',subtitle:'Built for movement',image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700'},
  {name:'Lifestyle',subtitle:'Everyday icons',image:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=700'},
  {name:'Casual',subtitle:'Effortless essentials',image:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=700'},
];
const money = (n) => `$${n.toFixed(2)}`;
function load(key, fallback) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }

function ProductCard({product, favorite, onFavorite, onOpen}) {
  return <article className="product-card">
    <div className="product-photo" onClick={() => onOpen(product)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onOpen(product);}}>
      <img src={product.image} alt={product.name} loading="lazy" />
      <span className="tag">{product.badge}</span>
      <button className={`favorite ${favorite ? 'active' : ''}`} onClick={e => {e.stopPropagation();onFavorite(product.id);}} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}>{favorite ? '♥' : '♡'}</button>
      <button className="quick-view" onClick={e => {e.stopPropagation();onOpen(product);}}>Quick view ↗</button>
    </div>
    <div className="product-details">
      <div className="product-meta"><span>{product.brand}</span><span>★ {product.rating}</span></div>
      <h3><button type="button" className="product-title-link" onClick={() => onOpen(product)}>{product.name}</button></h3><p>{product.category} / {product.color}</p>
      <div className="product-bottom"><div><strong>{money(product.price)}</strong> <del>{money(product.oldPrice)}</del></div><button className="add-btn" onClick={() => onOpen(product)}>+ Add to Cart</button></div>
    </div>
  </article>;
}
function Footer({onCategory}) {
  const [email,setEmail] = useState(''); const [subscribed,setSubscribed] = useState(false);
  return <footer className="footer" id="about"><div className="container"><div className="footer-grid"><div><a className="logo" href="/">SHOES<span>.</span></a><p>Premium footwear. Modern lifestyle.<br/>Find your next favorite pair.</p><div className="socials"><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://www.pinterest.com/" target="_blank" rel="noreferrer">Pinterest ↗</a></div></div><div><h4>Explore</h4><a href="/">Home</a><a href="/shop">Shop all</a><a href="/categories">Categories</a></div><div><h4>Collections</h4>{categories.map(c=><a key={c.name} href={`/shop?category=${encodeURIComponent(c.name)}`} onClick={e=>{e.preventDefault();onCategory(c.name);}}>{c.name}</a>)}</div><div><h4>Stay in the loop</h4><p>Get updates on new drops and collections.</p><form className="newsletter" onSubmit={e=>{e.preventDefault();setSubscribed(true);}}><input aria-label="Newsletter email" type="email" required value={email} onChange={e=>{setEmail(e.target.value);setSubscribed(false);}} placeholder="Email address"/><button aria-label="Subscribe" type="submit">→</button></form>{subscribed && <small className="muted">Thanks! Demo subscription recorded for this session.</small>}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SHOES. All rights reserved.</span><span>Designed for the next step. ⚡</span></div></div></footer>;
}


export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('shoes-theme') === 'light' ? 'light' : 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('shoes-theme', theme);
  }, [theme]);
  const [search,setSearch] = useState(''); const [sort,setSort] = useState('default');
  const [cart,setCart] = useState(()=>load('shoes-cart-v2',[])); const [favorites,setFavorites] = useState(()=>load('shoes-favorites-v2',[]));
  const [cartOpen,setCartOpen] = useState(false);
  const [mobileMenu,setMobileMenu] = useState(false);
  const [favoritesOnly,setFavoritesOnly] = useState(false);
  // Route-driven state: no synchronous setState inside useEffect.
  const path = location.pathname;
  const queryCategory = new URLSearchParams(location.search).get('category');
  const category = categories.some(c => c.name === queryCategory) ? queryCategory : 'All';
  const authMode = path === '/login' || path === '/register';
  const selectedProduct = path.startsWith('/product/')
    ? products.find(p => p.id === Number(path.split('/')[2])) ?? null
    : null;

  useEffect(() => {
    if (path.startsWith('/product/') || authMode) return;
    const section = path === '/shop' ? 'shop' : path === '/categories' ? 'categories' : path === '/about' ? 'about' : 'home';
    const frame = requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    return () => cancelAnimationFrame(frame);
  }, [path, location.search, authMode]);
  function go(path) { navigate(path); setMobileMenu(false); }
  function openProduct(product) { navigate(`/product/${product.id}`); }
  function closeProduct() { navigate('/shop'); }
  function switchAuth(mode) { navigate(mode === 'register' ? '/register' : '/login'); }


  useEffect(()=>localStorage.setItem('shoes-cart-v2',JSON.stringify(cart)),[cart]);
  useEffect(()=>localStorage.setItem('shoes-favorites-v2',JSON.stringify(favorites)),[favorites]);
  useEffect(()=>{document.body.style.overflow = (cartOpen||selectedProduct)?'hidden':'';return ()=>{document.body.style.overflow='';};},[cartOpen,selectedProduct]);
  const filteredProducts = useMemo(()=>{let result=products.filter(p=>(category==='All'||p.category===category)&&(!favoritesOnly||favorites.includes(p.id))&&`${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(search.toLowerCase()));if(sort==='low')result.sort((a,b)=>a.price-b.price);if(sort==='high')result.sort((a,b)=>b.price-a.price);if(sort==='rating')result.sort((a,b)=>b.rating-a.rating);return result;},[category,search,sort,favoritesOnly,favorites]);
  const cartCount=cart.reduce((n,p)=>n+p.quantity,0);const subtotal=cart.reduce((n,p)=>n+p.price*p.quantity,0);const shipping=subtotal>=150||subtotal===0?0:12;
  

  function chooseCategory(value) {
    setFavoritesOnly(false);
    go(value === 'All' ? '/shop' : `/shop?category=${encodeURIComponent(value)}`);
    requestAnimationFrame(() => document.getElementById('shop')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function addToCart(product,size){setCart(current=>{const existing=current.find(p=>p.id===product.id&&p.size===size);return existing?current.map(p=>p.id===product.id&&p.size===size?{...p,quantity:p.quantity+1}:p):[...current,{...product,size,quantity:1}];});if(location.pathname.startsWith('/product/')) navigate('/shop');setCartOpen(true);}
  function updateQuantity(id,size,change){setCart(current=>current.map(p=>p.id===id&&p.size===size?{...p,quantity:p.quantity+change}:p).filter(p=>p.quantity>0));}
  function toggleFavorite(id){setFavorites(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);}
  if (authMode) return <AuthPage />;
  return <div className="app"><div className="announcement">FREE SHIPPING ON ORDERS OVER $150 <span>✦</span> NEW COLLECTION AVAILABLE NOW</div><header className="header"><nav className="nav container"><a className="logo" href="/" onClick={e=>{e.preventDefault();go('/');}}>SHOES<span>.</span></a><div className={`nav-links ${mobileMenu?'open':''}`}><a href="/" onClick={e=>{e.preventDefault();go('/');}}>Home</a><a href="/shop" onClick={e=>{e.preventDefault();go('/shop');}}>Shop</a><a href="/categories" onClick={e=>{e.preventDefault();go('/categories');}}>Categories</a><a href="/about" onClick={e=>{e.preventDefault();go('/about');}}>About</a></div><div className="nav-actions"><button className="icon-btn search-trigger" onClick={()=>{setFavoritesOnly(false);chooseCategory('All');setTimeout(()=>document.getElementById('search-input')?.focus(),100);}}>⌕ <span>Search</span></button><button className={`icon-btn ${favoritesOnly?'selected':''}`} onClick={()=>{go('/shop');setFavoritesOnly(v=>!v);requestAnimationFrame(()=>document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}));}} aria-label="Show favorites">♡ <span>{favorites.length}</span></button><button className="icon-btn" onClick={()=>setCartOpen(true)} aria-label="Open cart">🛒 <span>{cartCount}</span></button><button className="account-btn" onClick={()=>switchAuth('login')}>Sign In / Sign Up</button><button type="button" className="theme-toggle" onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} aria-label="Toggle color theme">{theme==='dark'?'☀ Light':'☾ Dark'}</button><button className="menu-btn" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">☰</button></div></nav></header>
  <main className="container"><section className="hero" id="home"><div className="hero-content"><div className="eyebrow">THE NEW ERA OF FOOTWEAR</div><h1>WALK<br/>YOUR<br/>WAY.</h1><p>Discover premium sneakers, iconic styles and everyday essentials. Your next favorite pair starts here.</p><button className="primary" onClick={()=>chooseCategory('All')}>EXPLORE COLLECTION →</button><div className="hero-stats"><span><strong>06+</strong> Curated styles</span><span><strong>3</strong> Collections</span></div></div><img className="hero-image" src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200" alt="Red featured sneaker"/></section>
  <section className="benefits" id="features"><div><strong>↗ Free Shipping</strong><small>On orders over $150</small></div><div><strong>⚡ Premium Quality</strong><small>Carefully selected footwear</small></div><div><strong>↩ Easy Returns</strong><small>30-day return policy (demo)</small></div></section>
  <section className="section" id="categories"><div className="section-heading"><div><div className="eyebrow">FIND YOUR STYLE</div><h2>Shop by Category</h2><p className="muted">The right pair for every moment.</p></div><button className="text-link" onClick={()=>chooseCategory('All')}>View all products ↗</button></div><div className="category-grid">{categories.map(c=><button key={c.name} className="category-card" onClick={()=>chooseCategory(c.name)}><img src={c.image} alt="" loading="lazy"/><span className="category-overlay"><strong>{c.name}</strong><small>{c.subtitle}</small></span><span className="category-arrow">↗</span></button>)}</div></section>
  <section className="section" id="shop"><div className="section-heading"><div><div className="eyebrow">CURATED FOR YOU</div><h2>{favoritesOnly?'Your Favorites':'Our Collection'}</h2><p className="muted">Find your perfect fit from our latest selection.</p></div><label className="search-box"><span>⌕</span><input id="search-input" placeholder="Search sneakers..." value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="filter-bar"><div className="filters">{['All',...categories.map(c=>c.name)].map(c=><button key={c} className={`filter ${category===c&&!favoritesOnly?'active':''}`} onClick={()=>chooseCategory(c)}>{c}</button>)}</div><div className="sort-group"><span>{filteredProducts.length} products</span><select aria-label="Sort products" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">Featured</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="rating">Top Rated</option></select></div></div><div className="product-grid">{filteredProducts.map(product=><ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={toggleFavorite} onOpen={openProduct}/>)}</div>{!filteredProducts.length&&<div className="empty">No products found. <button onClick={()=>{setSearch('');chooseCategory('All');}}>Clear filters</button></div>}</section>
  <section className="promo"><div className="eyebrow">YOUR STYLE. YOUR RULES.</div><h2>STEP INTO<br/>SOMETHING NEW.</h2><p>Explore the collection and find your next everyday essential.</p><button className="primary" onClick={()=>chooseCategory('All')}>SHOP THE COLLECTION →</button></section></main>
  <Footer onCategory={chooseCategory}/>
  {selectedProduct&&<ProductModal product={selectedProduct} onClose={closeProduct} onAddToCart={addToCart} favorite={favorites.includes(selectedProduct.id)} onFavorite={()=>toggleFavorite(selectedProduct.id)}/>}
  {cartOpen&&<div className="overlay" onMouseDown={()=>setCartOpen(false)}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart" onMouseDown={e=>e.stopPropagation()}><div className="drawer-head"><h2>Your Cart ({cartCount})</h2><button className="close-btn" onClick={()=>setCartOpen(false)} aria-label="Close cart">✕</button></div>{cart.length===0?<div className="empty">Your cart is empty.<br/><button onClick={()=>{setCartOpen(false);chooseCategory('All');}}>Start shopping →</button></div>:<><div className="cart-list">{cart.map(item=><div className="cart-item" key={`${item.id}-${item.size}`}><img src={item.image} alt={item.name}/><div className="cart-item-info"><strong>{item.name}</strong><small>EU {item.size} · {item.color}</small><span>{money(item.price)}</span><div className="quantity"><button onClick={()=>updateQuantity(item.id,item.size,-1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={()=>updateQuantity(item.id,item.size,1)} aria-label="Increase quantity">+</button></div></div><button className="remove-btn" onClick={()=>setCart(current=>current.filter(p=>!(p.id===item.id&&p.size===item.size)))} aria-label="Remove item">✕</button></div>)}</div><div className="drawer-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Shipping</span><strong>{shipping===0?'FREE':money(shipping)}</strong></div><div className="grand-total"><span>Total</span><strong>{money(subtotal+shipping)}</strong></div><button className="primary full" onClick={()=>alert('Demo store: checkout is not connected yet.')}>PROCEED TO CHECKOUT →</button><small>Demo storefront — no payments are processed.</small></div></>}</aside></div>}
  {authMode&&<AuthModal key={authMode} mode={authMode} setMode={switchAuth} onClose={closeAuth} onLogin={u=>{setUser(u);closeAuth();}}/>}
  </div>;
};
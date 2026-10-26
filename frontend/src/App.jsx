import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import {
  BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate, useParams,
} from "react-router-dom";

const api = axios.create({ baseURL: "http://localhost:5000" });

const errorMessage = (err, fallback) =>
  typeof err.response?.data === "string" ? err.response.data : fallback;

function Alert({ type, message }) {
  if (!message) return null;
  return <div className={`alert ${type}`}>{message}</div>;
}

function Avatar({ name, big }) {
  return <div className={big ? "avatar big" : "avatar"}>{name?.[0]?.toUpperCase()}</div>;
}

function Navbar({ user, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/feed" className="brand">Instagram</Link>
        <nav className="nav-links">
          <NavLink to="/feed">Inicio</NavLink>
          <NavLink to={`/perfil/${user.id}`}>Mi perfil</NavLink>
          <button className="btn btn-ghost" onClick={onLogout}>Cerrar Sesion</button>
        </nav>
      </div>
    </header>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", form);
      onLogin(res.data);
      navigate("/feed");
    } catch (err) {
      setError(err.response?.status === 401 ? "Email o contraseña incorrectos" : "No se pudo conectar con el servidor");
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <span className="brand">Instagram</span>
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input name="password" type="password" placeholder="Contraseña" onChange={handleChange} required />
          <Alert type="error" message={error} />
          <button className="btn">Iniciar sesión</button>
        </form>
        <p>¿No tenés cuenta? <Link to="/register">Registrate</Link></p>
      </div>
    </div>
  );
}

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      setAlert({ type: "success", message: "¡Cuenta creada! Redirigiendo al login..." });
      setTimeout(() => navigate("/"), 1200);
    }
    catch (err) {
      setAlert({
        type: "error",
        message: err.response?.status === 409 ? "Ese email ya está registrado" : "Error al registrar",
      });
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <span className="brand">Instagram</span>
        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Nombre de usuario" onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input name="password" type="password" placeholder="Contraseña" onChange={handleChange} required />
          {alert && <Alert {...alert} />}
          <button className="btn">Registrarme</button>
        </form>
        <p>¿Ya tenés cuenta? <Link to="/">Iniciá sesión</Link></p>
      </div>
    </div>
  );
}

function PostCard({ post, user, onDelete, onEdit }) {
  const [liked, setLiked] = useState(false);
  const isOwner = post.userId === user.id;

  return (
    <article className="card">
      <div className="post-header">
        <Link to={`/perfil/${post.userId}`} className="post-user">
          <Avatar name={post.userName} />
          {post.userName}
        </Link>
        {isOwner && (
          <div>
            <button className="btn btn-ghost" onClick={() => onEdit(post)}>Editar</button>
            <button className="btn btn-ghost" onClick={() => onDelete(post.id)}>Borrar</button>
          </div>
        )}
      </div>
      <img
        className="post-image"
        src={post.imageUrl}
        alt={post.description}
        onError={(e) => (e.target.src = "https://placehold.co/600x600?text=Imagen+no+disponible")}
      />
      <div className="post-body">
        <div className="post-actions">
          <button className="like-btn" onClick={() => setLiked(!liked)}>{liked ? "❤️" : "🤍"}</button>
          <span className="like-count">{liked ? "Te gusta" : ""}</span>
        </div>
        <div className="caption"><b>{post.userName}</b>{post.description}</div>
      </div>
    </article>
  );
}

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ imageUrl: "", description: "" });
  const [error, setError] = useState("");

  const loadPosts = () =>
    api.get("/posts").then((res) => setPosts(res.data)).catch(() => setError("No se pudieron cargar los posts"));

  useEffect(() => {
    loadPosts().finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/posts", { ...form, userId: user.id });
      setForm({ imageUrl: "", description: "" });
      setError("");
      loadPosts();
    } catch (err) {
      setError(errorMessage(err, "Error al publicar"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Borrar esta publicación?")) return;
    await api.delete(`/posts/${id}`, { params: { userId: user.id } });
    setPosts(posts.filter((p) => p.id !== id));
  };

  const handleEdit = async (post) => {
    const description = prompt("Nueva descripción:", post.description);
    if (description === null) return;
    await api.put(`/posts/${post.id}`, { userId: user.id, description });
    setPosts(posts.map((p) => (p.id === post.id ? { ...p, description } : p)));
  };

  return (
    <main className="container">
      <section className="card card-pad new-post">
        <form onSubmit={handleCreate}>
          <input
            placeholder="URL de la imagen"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            required
          />
          <textarea
            rows="2"
            placeholder={`¿Qué estás pensando, ${user.name}?`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Alert type="error" message={error} />
          <button className="btn">Publicar</button>
        </form>
      </section>

      {loading && <div className="spinner" />}
      {!loading && posts.length === 0 && <p className="empty">Todavía no hay publicaciones</p>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} user={user} onDelete={handleDelete} onEdit={handleEdit} />
      ))}
    </main>
  );
}

function Perfil() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    Promise.all([api.get(`/users/${id}`), api.get(`/users/${id}/posts`)])
      .then(([userRes, postsRes]) => {
        setProfile(userRes.data);
        setPosts(postsRes.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner" />;
  if (notFound) return <p className="empty">El usuario no existe</p>;

  return (
    <main className="container">
      <section className="card profile-head">
        <Avatar name={profile.name} big />
        <div>
          <h2>{profile.name}</h2>
          <span>{posts.length} publicaciones</span>
        </div>
      </section>
      {posts.length === 0 ? (
        <p className="empty">Todavía no publicó nada</p>
      ) : (
        <section className="grid">
          {posts.map((p) => (
            <img key={p.id} src={p.imageUrl} alt={p.description} title={p.description} />
          ))}
        </section>
      )}
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const handleLogin = (data) => {
    setUser(data);
    try { localStorage.setItem("user", JSON.stringify(data)); } catch { /* storage unavailable */ }
  };

  const handleLogout = () => {
    setUser(null);
    try { localStorage.removeItem("user"); } catch { /* storage unavailable */ }
  };

  // wraps the pages that need a logged-in user
  const Private = ({ children }) =>
    user ? (<><Navbar user={user} onLogout={handleLogout} />{children}</>) : <Navigate to="/" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/feed" /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/feed" element={<Private><Feed user={user} /></Private>} />
        <Route path="/perfil/:id" element={<Private><Perfil /></Private>} />
      </Routes>
    </BrowserRouter>
  );
}
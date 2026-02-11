import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router";

import Offers from "./pages/Offers.js";
import Pilot from "./pages/Pilot.js";
import Raffle from "./pages/Raffle.js";
import Tags from "./pages/Tags.js";
import Verified from "./pages/Verified.js";

type User = {
  id: string;
  name: string;
  avatar: string;
};

function AdminLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json() as Promise<{ user: User }>;
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading...</div>;

  if (!user)
    return (
      <div className="container">
        <p>You are not logged in. Please use the login link from Discord.</p>
      </div>
    );

  return (
    <div className="container">
      <div className="admin-header">
        <h1>O.A.F. Admin Panel</h1>
        <div className="user-menu">
          <span>{user.name}</span>
          <img
            className="avatar"
            src={user.avatar}
            alt={user.name}
            title={user.name}
          />
          <nav className="nav-links">
            <Link to="/admin/offers">Offers</Link>
            <Link to="/admin/pilot">Pilot</Link>
            <Link to="/admin/tags">Tags</Link>
            <Link to="/admin/verified">Verified</Link>
            <Link to="/admin/raffle">Raffle</Link>
            <a href="/logout">Logout</a>
          </nav>
        </div>
      </div>
      <hr />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<div className="container">it's oafin time</div>}
        />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="offers" replace />} />
          <Route path="offers" element={<Offers />} />
          <Route path="pilot" element={<Pilot />} />
          <Route path="tags" element={<Tags />} />
          <Route path="verified" element={<Verified />} />
          <Route path="raffle" element={<Raffle />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

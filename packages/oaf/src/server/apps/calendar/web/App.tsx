import { BrowserRouter, Route, Routes } from "react-router";

import CalendarPage from "./pages/CalendarPage.js";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="container">
              <CalendarPage />
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

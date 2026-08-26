import React, { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import axios from "axios";

export const ServerUrl = "http://localhost:8000";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get(
          ServerUrl + "/api/user/current-user",
          { withCredentials: true }
        );
            console.log(res.data)
        setUser(res.data);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/login"
        element={<Login setUser={setUser} />}
      />
    </Routes>
  );
}

export default App;
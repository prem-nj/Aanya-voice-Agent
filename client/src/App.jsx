import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import axios from "axios";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from './components/Navbar'
import Builder from './pages/Builder'
import Billing from './pages/Billing'

export const ServerUrl = "https://aanya-voice-agent.onrender.com";
export const CLIENT_URL = "https://aanya-voice-agent-1.onrender.com"

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

      <Route
        path="/login"
        element={<Login setUser={setUser} />}
      />
      
      <Route path="/*" element={<ProtectedRoute loading={loading} user={user}>
        <Navbar setUser={setUser} user={user}/>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/billing" element={<Billing user={ user} setUser={setUser} />}/>
          <Route path="/builder" element={<Builder user={user} setUser={setUser} />}/>
          <Route path="*" element={<Navigate to="/" replace/>} />
        </Routes>


      </ProtectedRoute>} />
         </ Routes>
  );
}

export default App;

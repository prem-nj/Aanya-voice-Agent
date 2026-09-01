import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import axios from "axios";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import Builder from "./pages/Builder";
import Billing from "./pages/Billing";
import { ServerUrl } from "./config";

export { ServerUrl, CLIENT_URL } from "./config";

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
        <AppShell user={user} setUser={setUser}>

          <Routes>
            <Route path="/" element={<Home />} />
             <Route path="/home" element={<Home />} />
            <Route path="/billing" element={<Billing user={ user} setUser={setUser} />}/>
            <Route path="/builder" element={<Builder user={user} setUser={setUser} />}/>
            <Route path="*" element={<Navigate to="/" replace/>} />
          </Routes>


        </AppShell>
      </ProtectedRoute>} />
         </ Routes>
  );
}

export default App;

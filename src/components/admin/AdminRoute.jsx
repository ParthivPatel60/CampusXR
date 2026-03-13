import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "../../config/firebase";

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState("loading");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (user) {
        setStatus("auth");
      } else {
        setStatus("unauth");
        navigate("/admin/login");
      }
    });
    return () => unsub();
  }, [navigate]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <span>Loading...</span>
      </div>
    );
  }

  return status === "auth" ? children : null;
}

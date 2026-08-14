import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:3000/api/auth/login",
        formData
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      alert("Login Successful!");

      navigate("/");
    } catch (err) {
        console.log(err.response);
        alert(JSON.stringify(err.response?.data) || "Login Failed");
  }
  };

  return (
   <div
    style={{
      width: "400px",
      margin: "100px auto",
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
    }}
  >
    <h1
      style={{
        color: "#000",
        fontSize: "48px",
        fontWeight: "bold",
        marginBottom: "40px",
      }}
    >
      Login
     </h1>

     <form onSubmit={handleLogin}>
      <input
        type="email"
        name="email"
        placeholder="Enter Email"
        onChange={handleChange}
        required
        style={{
          width: "100%",
          padding: "16px",
          fontSize: "18px",
          borderRadius: "12px",
          border: "1px solid #ddd",
          marginBottom: "20px",
        }}
      />

      <input
        type="password"
        name="password"
        placeholder="Enter Password"
        onChange={handleChange}
        required
        style={{
          width: "100%",
          padding: "16px",
          fontSize: "18px",
          borderRadius: "12px",
          border: "1px solid #ddd",
          marginBottom: "20px",
        }}
      />

      <button
        type="submit"
        style={{
          width: "100%",
          padding: "15px",
          backgroundColor: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          fontSize: "18px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Login
      </button>
    </form>

    <p
      style={{
        marginTop: "20px",
        color: "#000",
        fontSize: "18px",
        fontWeight: "500",
      }}
    >
      Don't have an account?{" "}
      <Link
        to="/register"
        style={{
          color: "#000",
          fontWeight: "bold",
          textDecoration: "none",
        }}
      >
        Register
      </Link>
    </p>
  </div>
);
}

export default Login;
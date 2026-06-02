// import { FormEvent, useState } from "react";
// import { useAuth } from "./AuthContext";

// type Mode = "signin" | "signup";

// export default function AuthPage() {
//   const { signIn, signUp } = useAuth();
//   const [mode, setMode] = useState<Mode>("signin");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [name, setName] = useState("");
//   const [error, setError] = useState<string | null>(null);
//   const [submitting, setSubmitting] = useState(false);

//   async function handleSubmit(e: FormEvent) {
//     e.preventDefault();
//     setError(null);
//     setSubmitting(true);
//     try {
//       if (mode === "signup") {
//         await signUp(email, password, name || undefined);
//       } else {
//         await signIn(email, password);
//       }
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Something went wrong");
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div className="auth-layout">
//       <div className="auth-card">
//         <h1>CrossPost Hub</h1>
//         <p className="subtitle">
//           {mode === "signin"
//             ? "Sign in to manage your cross-posting rules"
//             : "Create an account to get started"}
//         </p>

//         <div className="auth-tabs">
//           <button
//             type="button"
//             className={mode === "signin" ? "active" : ""}
//             onClick={() => setMode("signin")}
//           >
//             Sign in
//           </button>
//           <button
//             type="button"
//             className={mode === "signup" ? "active" : ""}
//             onClick={() => setMode("signup")}
//           >
//             Sign up
//           </button>
//         </div>

//         {error && (
//           <div className="toast error" role="alert">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className="auth-form">
//           {mode === "signup" && (
//             <label>
//               Name
//               <input
//                 type="text"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="Your name"
//                 autoComplete="name"
//               />
//             </label>
//           )}
//           <label>
//             Email
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="you@example.com"
//               required
//               autoComplete="email"
//             />
//           </label>
//           <label>
//             Password
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
//               required
//               minLength={mode === "signup" ? 8 : 1}
//               autoComplete={mode === "signup" ? "new-password" : "current-password"}
//             />
//           </label>
//           <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
//             {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

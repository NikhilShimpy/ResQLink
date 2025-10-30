const firebaseConfig = {
  apiKey: "AIzaSyAkIp1wIdz7LTa5rZ2YJfoKcxTtUEflyhI",
  authDomain: "samudra-suraksha-477cf.firebaseapp.com",
  projectId: "samudra-suraksha-477cf",
  storageBucket: "samudra-suraksha-477cf.firebasestorage.app",
  messagingSenderId: "538135967467",
  appId: "1:538135967467:web:938ca314bf21e10acd70ae"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ---------------- PERSISTENCE ----------------
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => console.log("Persistence set to LOCAL (keeps user signed in across sessions)."))
  .catch((error) => console.error("Persistence error:", error.message));


// ---------------- SIGN UP ----------------
function signUp() {
  const name = document.getElementById("name").value;
  const mobilenumber = document.getElementById("mobilenumber").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const address = document.getElementById("address").value;

  if (!email || !password || !name || !mobilenumber || !address) {
    alert("Please fill out all fields.");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      user.sendEmailVerification().catch(error => {
        console.error("Email verification error:", error.message);
      });

      return db.collection("users").doc(user.uid).set({
        uid: user.uid,
        name,
        mobilenumber,
        email,
        role: "citizen",
        address,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      alert("Signup successful! Please check your email to verify before logging in.");
      window.location.href = "/login";
    })
    .catch((error) => {
      console.error("Signup error:", error.message);
      alert(error.message);
    });
}


// ---------------- SIGN IN ----------------
function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please fill out all fields.");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      if (!user.emailVerified) {
        alert("Please verify your email before logging in.");
        auth.signOut();
        return;
      }

      return db.collection("users").doc(user.uid).get();
    })
    .then((doc) => {
      if (doc && doc.exists) {
        const role = doc.data().role;

        return fetch("/set-role/" + role)
          .then(response => response.json())
          .then(data => {
            if (data.status === "success") {
              if (role === "citizen") {
                window.location.href = "/citizen/dashboard";
              } else if (role === "admin") {
                window.location.href = "/admin/dashboard";
              } else if (role === "analyst") {
                window.location.href = "/analyst/dashboard";
              }
            } else {
              alert("Failed to set role.");
            }
          });
      }
    })
    .catch((error) => {
      console.error("Signin error:", error.message);
      alert(error.message);
    });
}


// ---------------- LOGOUT ----------------
function logout() {
  auth.signOut()
    .then(() => {
      console.log("User signed out from Firebase.");
      return fetch("/logout", { method: "GET" }); // Clear Flask session too
    })
    .then(() => {
      // After clearing, force user to index
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Logout error:", error.message);
      alert("Logout failed.");
    });
}


// ---------------- AUTO LOGIN CHECK ----------------
auth.onAuthStateChanged((user) => {
  if (user) {
    if (!user.emailVerified) {
      console.warn("User email not verified, forcing logout.");
      auth.signOut();
      return;
    }

    // 🔹 Only auto-redirect if we're on "/" (home) 
    // not on login/signup, and user actually has Flask session
    if (window.location.pathname === "/") {
      db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          const role = doc.data().role;
          fetch("/set-role/" + role)
            .then(res => res.json())
            .then(data => {
              if (data.status === "success") {
                if (role === "citizen") {
                  window.location.href = "/citizen/dashboard";
                } else if (role === "admin") {
                  window.location.href = "/admin/dashboard";
                } else if (role === "analyst") {
                  window.location.href = "/analyst/dashboard";
                }
              }
            });
        }
      });
    }
  } else {
    console.log("No user logged in.");
    // 🔹 If user is logged out and tries to access login/signup/index → stay there, do NOT redirect
  }
});

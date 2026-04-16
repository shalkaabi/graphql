const form = document.getElementById("registerForm");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const age = document.getElementById("age").value;
  const gender = document.getElementById("gender").value;
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  const errorEl = document.getElementById("error");
  const successEl = document.getElementById("success");

  errorEl.textContent = "";
  successEl.textContent = "";


  if (!firstName || !lastName || !username || !email || !password || !confirmPassword || !gender|| !age) {
    errorEl.textContent = "Please fill all required fields";
    return;
  }
    

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorEl.textContent = "Invalid email format";
    return;
  }


const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).+$/;


if (password.includes(" ")) {
  errorEl.textContent = "Password must not contain spaces";
  return;
}


if (password.length < 8) {
  errorEl.textContent = "Password must be at least 8 characters";
  return;
}


if (!passwordRegex.test(password)) {
  errorEl.textContent =
    "Password must include letters, numbers, and symbols";
  return;
}


if (password !== confirmPassword) {
  errorEl.textContent = "Passwords do not match";
  return;
}


  successEl.textContent = "Registered successfully!";


  localStorage.setItem("registeredUser", JSON.stringify({
    firstName,
    lastName,
    age,
    gender,
    username,
    email,
    password
  }));

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500);
});

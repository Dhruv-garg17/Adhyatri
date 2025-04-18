document.addEventListener('DOMContentLoaded', function () {
    const resetForm = document.getElementById('forgotPasswordForm');
  
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value.trim();
  
      if (!email) {
        alert("Please enter your email address.");
        return;
      }
  
      // Calls sendPasswordReset from auth.js
      sendPasswordReset(email)
        .then(result => {
          // Log the response for debugging (safely)
          console.log("Password reset response:", result);
  
          // Ensure result is an object and has message
          if (result && typeof result === 'object') {
            alert(result.message);
            if (result.success) {
              window.location.href = 'login.html';
            }
          } else {
            alert("Unexpected response from the server.");
          }
        })
        .catch(error => {
          console.error("Unexpected error in forgot-password.js:", error);
          alert("An unexpected error occurred. Please try again later.");
        });
    });
  });
  
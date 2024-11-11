import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { auth } from './firebaseConfig.js';

// login.js
const app = Vue.createApp({
    data() {
        return {
            email: '',
            password: ''
        };
    },
    mounted() {
        // Check for authentication state change when the app is mounted
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // console.log("User is logged in:", user.email);

                // Redirect to home page if the user is already logged in
                window.location.href = "home.html";
            } else {
                console.log("No user is logged in");
            }
        });
    },
    methods: {
        async login() {
            try {
                await signInWithEmailAndPassword(auth, this.email, this.password);
            } catch (error) {
                // alert(error.message); // Display error message to user
                alert("There isn't a user with these credentials on our website. Try again or register for an account.");
            }
        },
        async resetPassword() {

            if (!this.email) {
                alert("Please enter your email address before requesting a password reset.");
                return;
            }
            try {
                await sendPasswordResetEmail(auth, this.email);
                // Show modal for confirmation or success message
                const modal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
                modal.show();
            } catch (error) {
                alert("Email is invalid. Enter again")
            }
        }
    }
});

const vm = app.mount('#app');






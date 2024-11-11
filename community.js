import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail ,signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, getDoc, addDoc, updateDoc ,collection, deleteDoc, query, where, serverTimestamp, onSnapshot} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes, deleteObject, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { db, auth, storage } from './firebaseConfig.js'; //With this line you dont need to initialise app as firebaseConfig.js does it already



// Global variable to store all memories
let allMemories = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        setupFriendRequestsListener();
        setupSentFriendRequestsListener(); 
        loadFriendRequests();
        loadSentFriendRequests();
        loadFriendsMemories();

    } else {
        console.log("No user signed in.");
    }
});
// Helper functions
window.closeModal = async function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}


// (1) Search for friends
window.searchForUser = async function searchForUser() {
    const usernameInput = document.getElementById("username-search").value.trim().toLowerCase();
    const searchResults = document.getElementById("search-results");

    // Hide dropdown if input is empty
    if (!usernameInput) {
        searchResults.style.display = "none";
        searchResults.innerHTML = "";
        return;
    } else {
        searchResults.style.display = "block"; // Show dropdown if there is input
    }

    const currentUserId = auth.currentUser.uid;
    const usersRef = collection(db, "users");

    // Retrieve the current user's friends and friend requests
    const friendsSnapshot = await getDocs(collection(db, `users/${currentUserId}/friends`));
    const friendRequestsSnapshot = await getDocs(collection(db, `users/${currentUserId}/friendRequests`));
    const sentFriendRequestsSnapshot = await getDocs(collection(db, `users/${currentUserId}/sentFriendRequests`));

    // Store friend, incoming friend request, and sent request IDs in sets
    const friendIds = new Set(friendsSnapshot.docs.map(doc => doc.id));
    const friendRequestIds = new Set(friendRequestsSnapshot.docs.map(doc => doc.id));
    const sentFriendRequestIds = new Set(sentFriendRequestsSnapshot.docs.map(doc => doc.id));

    // Query for usernames that start with the input text (case-insensitive)
    const usernameQuery = query(
        usersRef,
        where("username_lower", ">=", usernameInput),
        where("username_lower", "<=", usernameInput + "\uf8ff")
    );
    const querySnapshot = await getDocs(usernameQuery);

    // If no matches found, show a "No users found" message
    if (querySnapshot.empty) {
        searchResults.innerHTML = "<p class='no-results'>No users found</p>";
        return;
    }

    // Display matching usernames in a dropdown list, excluding existing friends and users with pending friend requests
    let resultsHTML = "";
    querySnapshot.forEach((doc) => {
        // Exclude users who are already friends, have sent or received friend requests, or are the current user
        if (
            !friendIds.has(doc.id) && 
            !friendRequestIds.has(doc.id) && 
            !sentFriendRequestIds.has(doc.id) &&
            doc.id !== currentUserId
        ) {
            const userData = doc.data();
            resultsHTML += `
                <div class="search-result-item">
                    <p class="result-username">${userData.username} <span class="result-email">(${userData.email})</span></p>
                    <button class="add-friend-btn" onclick="sendFriendRequest('${doc.id}')">Add Friend</button>
                </div>`;
        }
    });

    // If no valid results after filtering, show "No users found"
    searchResults.innerHTML = resultsHTML || "<p class='no-results'>No users found</p>";
}


window.sendFriendRequest = async function sendFriendRequest(friendId) {
    const currentUserId = window.currentUserUID;
    const usersRef = collection(db, "users");

    try {
        // Retrieve the current user's username
        const currentUserDoc = await getDoc(doc(usersRef, currentUserId));
        const currentUsername = currentUserDoc.data().username;

        const friendRequestsRef = collection(doc(usersRef, friendId), "friendRequests");

        // Add a friend request to the friend's `friendRequests` collection
        await setDoc(doc(friendRequestsRef, currentUserId), {
            fromUserId: currentUserId,
            fromUsername: currentUsername,
            timestamp: serverTimestamp()
        });

        // Add the friend request to the current user's `sentFriendRequests` collection
        const friendDoc = await getDoc(doc(usersRef, friendId));
        await setDoc(doc(collection(doc(usersRef, currentUserId), "sentFriendRequests"), friendId), {
            toUserId: friendId,
            toUsername: friendDoc.data().username,
            timestamp: serverTimestamp()
        });

        // Reset the search bar
        document.getElementById("username-search").value = ""; // Clear the search input
        document.getElementById("search-results").style.display = "none"; // Hide search results

        // Show the modal to confirm the friend request was sent
        document.getElementById("request-sent-modal").style.display = "flex";
        console.log(`Friend request sent from user ${currentUserId} (${currentUsername}) to user ${friendId}.`);

        // Automatically refresh the "Outgoing Friend Requests" section
        loadSentFriendRequests();

    } catch (error) {
        console.error("Error sending friend request:", error);
    }
}


async function loadFriendRequests() {
    const currentUser = window.currentUserUID;

    if (!currentUser) {
        console.error("No user is signed in.");
        return;
    }

    const currentUserId = window.currentUserUID;
    const requestsRef = collection(doc(db, "users", currentUserId), "friendRequests");

    try {
        const snapshot = await getDocs(requestsRef);

        if (snapshot.empty) {
            console.log("No friend requests found for user:", currentUserId);
            document.getElementById("friend-requests").innerHTML = "<p>No outstanding friend requests!</p>";
            return;
        } 

        let requestsHTML = "";
        snapshot.forEach((doc) => {
            const request = doc.data();
            console.log("New friend request from:", request.fromUsername, "(", request.fromUserId, ")");
            requestsHTML += `
                <div class="friend-request-card">
                    <p>New friend request from: <strong>${request.fromUsername}</strong></p>
                    <button onclick="acceptFriendRequest('${request.fromUserId}', '${doc.id}', '${request.fromUsername}')">Accept</button>
                </div>`;
        });

        document.getElementById("friend-requests").innerHTML = requestsHTML;
    } catch (error) {
        console.error("Error loading friend requests:", error);
    }
}


window.acceptFriendRequest = async function acceptFriendRequest(friendId, requestId, friendUsername) {
    const currentUserId = auth.currentUser.uid;
    const currentUserRef = doc(db, "users", currentUserId);
    const friendRef = doc(db, "users", friendId);

    try {
        // Retrieve the current user's username
        const currentUserDoc = await getDoc(currentUserRef);
        const currentUsername = currentUserDoc.data().username;

        // Add friend to current user's `friends` subcollection with friendId and friendUsername
        await setDoc(doc(collection(currentUserRef, "friends"), friendId), {
            friendId: friendId,
            username: friendUsername
        });

        // Add current user to friend's `friends` subcollection with currentUserId and currentUsername
        await setDoc(doc(collection(friendRef, "friends"), currentUserId), {
            friendId: currentUserId,
            username: currentUsername
        });

        // Remove the friend request document from the current user's `friendRequests` subcollection
        await deleteDoc(doc(collection(currentUserRef, "friendRequests"), requestId));

        // Remove the friend request from `friendId`'s `sentFriendRequests` subcollection
        await deleteDoc(doc(collection(friendRef, "sentFriendRequests"), currentUserId));

        console.log(`Friend request accepted: ${friendUsername} (ID: ${friendId}) is now friends with ${currentUsername} (ID: ${currentUserId}).`);

        // Update the success message in the modal and display it
        document.getElementById("accepted-request-message").textContent = `You are now friends with ${friendUsername}!`;
        document.getElementById("accepted-request-modal").style.display = "flex";

        // Reload friend requests to update the UI
        loadFriendRequests();
        loadFriendsMemories();
        loadSentFriendRequests(); // Refresh the Outgoing Friend Requests section
    } catch (error) {
        console.error("Error accepting friend request:", error);
    }
}


window.loadFriendsMemories = async function loadFriendsMemories() {
    const currentUserId = window.currentUserUID;
    // console.log("Current User ID:", currentUserId);

    const friendsRef = collection(doc(db, "users", currentUserId), "friends");
    const friendsSnapshot = await getDocs(friendsRef);

    const memoriesRowElement = document.getElementById("memories-row");
    const filterFriendsGalleryElement = document.getElementById("filter-friends-gallery");
    const friendFilterContainer = document.getElementById("friend-filter-container");

    if (!memoriesRowElement || !filterFriendsGalleryElement || !friendFilterContainer) {
        console.error("Required elements not found in the DOM.");
        return;
    }

    // Clear global `allMemories` array and `memoriesRowElement` HTML to avoid duplication
    allMemories = [];
    memoriesRowElement.innerHTML = "";

    if (friendsSnapshot.empty) {
        console.log("No friends found for this user.");
        memoriesRowElement.innerHTML = "<p>No friends found.<br>Search and add new friends using the search bar above!</p>";
        friendFilterContainer.style.display = "none";
        return;
    } else {
        friendFilterContainer.style.display = "block";
    }

    let friendsListHTML = `
        <button id="view-all-btn" class="btn-filter-friends selected" onclick="loadFriendsMemories()">View All</button>
        <button id="personal-gallery-btn" class="btn-filter-friends" style="width:170px;" onclick="loadPersonalGallery()">View Personal Gallery</button>
    `;

    for (const friendDoc of friendsSnapshot.docs) {
        const friendId = friendDoc.id.trim();
        const friendUsername = friendDoc.data().username || "Unknown User";
        friendsListHTML += `<button id="friend-btn-${friendId}" class="btn-filter-friends" onclick="filterByFriend('${friendId}')">${friendUsername}</button>`;
    
        // console.log(`Fetching memories for path: /users/${friendId}/memories`);
    
        try {
            const memoriesRef = collection(doc(db, "users", friendId), "memories");
            const memoriesSnapshot = await getDocs(memoriesRef);
    
            if (!memoriesSnapshot.empty) {
                memoriesSnapshot.forEach((memoryDoc) => {
                    const memory = memoryDoc.data();
                    memory.friendUsername = friendUsername;
                    memory.friendId = friendId;
                    //Adding firestore memoryid into array (for use in likeMemory function)
                    memory.id = memoryDoc.id
                    allMemories.push(memory);
                });
            }
        } catch (error) {
            console.error(`Error retrieving memories for friend ${friendUsername} (ID: ${friendId}):`, error);
        }
    }
    
    filterFriendsGalleryElement.innerHTML = friendsListHTML;

    if (allMemories.length === 0) {
        memoriesRowElement.innerHTML = "<p>No memories found! Add new friends using the search bar above!</p>";
        return;
    }

    // Sort and display the latest set of memories
    allMemories.sort((a, b) => new Date(b.date) - new Date(a.date));
    displayMemories(allMemories);
    setActiveButton("view-all-btn");
}



// Function to set the active button by ID and remove 'selected' from others
function setActiveButton(buttonId) {
    const buttons = document.querySelectorAll(".btn-filter-friends");
    buttons.forEach(button => button.classList.remove("btn-filter-friends-active"));
    document.getElementById(buttonId).classList.add("btn-filter-friends-active");
}

// Function to filter memories by a specific friend
window.filterByFriend = async function filterByFriend(friendId) {
    const filteredMemories = allMemories.filter(memory => memory.friendId === friendId);
    // console.log(filteredMemories)
    displayMemories(filteredMemories);

    // Set the clicked friend's button as the active one
    setActiveButton(`friend-btn-${friendId}`);
}

// Function to load the user's personal gallery
window.loadPersonalGallery = async function loadPersonalGallery() {
    const currentUserId = window.currentUserUID;
    const personalMemoriesRef = collection(doc(db, "users", currentUserId), "memories");
    const personalMemoriesSnapshot = await getDocs(personalMemoriesRef);
    let personalMemories = [];

    personalMemoriesSnapshot.forEach((memoryDoc) => {
        const memory = memoryDoc.data();
        memory.friendUsername = "You"; // Display as 'You' for personal memories
        personalMemories.push(memory);
    });

    // Sort personal memories in reverse chronological order
    personalMemories.sort((a, b) => new Date(b.date) - new Date(a.date));

    displayMemories(personalMemories);

    // Set "View Personal Gallery" button as selected
    setActiveButton("personal-gallery-btn");
}

window.displayMemories = async function displayMemories(memoriesToDisplay) {
    const currentUserId = window.currentUserUID
    const memoriesRow = document.getElementById('memories-row');
    memoriesRow.innerHTML = ''; // Clear existing memories

    if (memoriesToDisplay.length === 0) {
        const message = document.createElement('div');
        message.classList.add('no-memories-message');
        message.innerHTML = "No friends found! Add new friends using the search bar above!";
        memoriesRow.appendChild(message);
        return;
    }

    for (const memory of memoriesToDisplay) {
        const memoryCard = document.createElement('div');
        memoryCard.classList.add('col-lg-4', 'col-md-6', 'col-sm-12', 'd-flex', 'justify-content-center', 'mb-4');

        // Log the classes of each memory card for verification
        // console.log("Memory card classes:", memory.name, memoryCard.classList);
        
        // Use the first image if available; else provide a placeholder
        const imageSrc = memory.images && memory.images.length > 0 ? memory.images[0] : "path/to/placeholder.jpg";
        
        // Await the result of alreadyLiked since it is an async function
        const likedClass = await alreadyLiked(currentUserId, memory.friendId, memory.id);
        // console.log(likedClass);
        
        memoryCard.innerHTML = `
            <div class="card">
                <img src="${imageSrc}" class="card-img-top" alt="${memory.description}">
                <div class="card-body">
                    <h5 class="card-title">${memory.name}</h5>
                    <p class="card-text"><i class="fas fa-calendar-alt"></i>&nbsp;${memory.date}</p>
                    <p class="card-text"><i class="fa-solid fa-user"></i>&nbsp;${memory.friendUsername}</p>
                    <div style="text-align: right;" class="card-text">
                        <button style="font-size: 13px;" class="like-button card-text" id="like-button-${memory.friendId}-${memory.id}" onclick="likeMemory('${memory.friendId}', '${memory.id}')">
                            <i class="fas fa-heart ${likedClass}"></i>&nbsp;${memory.likes || 0}
                        </button>
                    </div>
                </div>
            </div>
        `;


        memoriesRow.appendChild(memoryCard);
    };
}

window.alreadyLiked = async function alreadyLiked(currentUserId, friendId, memoryId) {
    try {
        // Reference to the specific memory document
        const memoryDocRef = doc(db, 'users', friendId,'memories', memoryId); // Adjust 'memories' to your collection name
        const memoryDoc = await getDoc(memoryDocRef);

        if (memoryDoc.exists()) {
            const memoryData = memoryDoc.data();
            // Check if 'isLiked' is an array and contains the currentUserId
            if (Array.isArray(memoryData.likedBy) && memoryData.likedBy.includes(currentUserId)) {
                return 'filled-heart'; // Return 'liked' class if user has already liked it
            }
        }

    } catch (error) {
        // console.error("Error checking if already liked:", error);
    }
    return ''; // Return empty string if not liked
}


window.likeMemory = async function likeMemory(friendId, memoryId) {
    const currentUserId = window.currentUserUID;
    const memoryRef = doc(db, "users", friendId, "memories", memoryId);
    const memorySnapshot = await getDoc(memoryRef);

    if (memorySnapshot.exists()) {
        const memoryData = memorySnapshot.data();
        const currentLikes = memoryData.likes || 0;
        const likedBy = memoryData.likedBy || []; // Array of user IDs who liked the memory

        // Check if the current user has already liked this memory
        const isLiked = likedBy.includes(currentUserId);
        let newLikes, updatedLikedBy;

        if (isLiked) {
            // User has already liked it, so unlike it
            newLikes = currentLikes - 1;
            updatedLikedBy = likedBy.filter(userId => userId !== currentUserId); // Remove user ID from likedBy array
        } else {
            // User hasn't liked it, so like it
            newLikes = currentLikes + 1;
            updatedLikedBy = [...likedBy, currentUserId]; // Add user ID to likedBy array
        }

        // Update Firestore with the new like count and likedBy array
        await updateDoc(memoryRef, { likes: newLikes, likedBy: updatedLikedBy });

        //Update all memories after liking
        const memoryIndex = allMemories.findIndex(m => m.id === memoryId && m.friendId === friendId);
        if (memoryIndex > -1) {
            allMemories[memoryIndex].likes = newLikes;
            allMemories[memoryIndex].likedBy = updatedLikedBy;
}
        // Update UI
        const likeButton = document.getElementById(`like-button-${friendId}-${memoryId}`);
        likeButton.innerHTML = `<i class="fas fa-heart ${isLiked ? '' : 'filled-heart'}"></i>&nbsp;${newLikes}`;
        likeButton.classList.toggle("liked", !isLiked); // Toggle "liked" class
    } else {
        console.error(`Memory with ID ${memoryId} does not exist in friend's collection.`);
    }
}


// Notifications for new posts by friends
// function setupMemoryNotifications() { /* ... */ }


function setupFriendRequestsListener() {
    const currentUserId = window.currentUserUID;
    const requestsRef = collection(doc(db, "users", currentUserId), "friendRequests");

    onSnapshot(requestsRef, (snapshot) => {
        console.log("Friend requests collection changed.");

        // Reload friend requests only; loadFriendsMemories will be triggered after friend request is accepted
        loadFriendRequests();
    });
}


window.loadSentFriendRequests = async function loadSentFriendRequests() {
    const currentUserId = window.currentUserUID;
    if (!currentUserId) {
        console.error("User is not authenticated.");
        return;
    }
    const sentRequestsRef = collection(db, "users", currentUserId, "sentFriendRequests");

    try {
        const snapshot = await getDocs(sentRequestsRef);

        if (snapshot.empty) {
            console.log("No outgoing friend requests found for user:", currentUserId);
            document.getElementById("sent-friend-requests").innerHTML = "<p>No outgoing friend requests!</p>";
            return;
        }

        let sentRequestsHTML = "";
        snapshot.forEach((doc) => {
            const request = doc.data();
            console.log("Outgoing friend request to:", request.toUsername, "(", request.toUserId, ")");
            sentRequestsHTML += `
                <div class="friend-request-card">
                    <p>Friend request sent to: <strong>${request.toUsername}</strong></p>
                    <button onclick="cancelFriendRequest('${doc.id}', '${request.toUserId}')">Cancel Request</button>
                </div>`;
        });

        document.getElementById("sent-friend-requests").innerHTML = sentRequestsHTML;
    } catch (error) {
        console.error("Error loading outgoing friend requests:", error);
    }
}

// (8) Cancel Outgoing Friend Request
window.cancelFriendRequest = async function cancelFriendRequest(requestId, toUserId) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("User is not authenticated.");
        return;
    }

    const currentUserId = currentUser.uid;
    const sentRequestRef = doc(db, "users", currentUserId, "sentFriendRequests", requestId);
    const recipientRequestRef = doc(db, "users", toUserId, "friendRequests", currentUserId);

    try {
        // Remove the request from the current user's sentFriendRequests subcollection
        await deleteDoc(sentRequestRef);

        // Remove the friend request from the recipient's friendRequests subcollection
        await deleteDoc(recipientRequestRef);

        console.log(`Friend request to ${toUserId} canceled by user ${currentUserId}.`);

        // Reload the outgoing friend requests list to update the UI
        loadSentFriendRequests();
    } catch (error) {
        console.error("Error canceling outgoing friend request:", error);
    }
}


function setupSentFriendRequestsListener() {
    const currentUserId = auth.currentUser.uid;
    const sentRequestsRef = collection(doc(db, "users", currentUserId), "sentFriendRequests");

    // Set up a real-time listener on the sent friend requests
    onSnapshot(sentRequestsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "removed") {
                console.log("Outgoing friend request has been removed, refreshing the UI.");

                // Refresh the Outgoing Friend Requests section
                loadSentFriendRequests();
            }
        });
    });
}


// document.addEventListener("DOMContentLoaded", () => {
//     onAuthStateChanged(auth, async (user) => {
//         if (user) {
//             setupFriendRequestsListener(); // Start listening for changes in friend requests
//             loadFriendRequests(); // Initial load of friend requests
//             try {
//                 await loadFriendsMemories(); // Initial load of friends' memories
//             } catch (error) {
//                 console.error("Error loading friends' memories:", error);
//             }
//         } else {
//             console.log("User not authenticated. Redirecting to login...");
//             // Add any redirection logic here, if necessary
//         }
//     });
// });


